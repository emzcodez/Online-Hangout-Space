-- Online Hangout Space: MySQL 8 advanced DBMS demonstrations
-- This script creates/replaces two views and recreates only its two named
-- procedures and trigger. It does not create, alter, or drop base tables, or
-- insert/update/delete base-table data merely by being sourced.

USE online_hangout_space;

-- ---------------------------------------------------------------------------
-- 1. Views
-- ---------------------------------------------------------------------------

-- One row per room, with independent aggregates so joins do not multiply counts.
-- room_members is the source of member_count; it reflects the stored membership
-- rows (including the owner row created by the application for new rooms).
CREATE OR REPLACE VIEW vw_room_statistics AS
SELECT
    r.room_id,
    r.room_name,
    r.owner_id,
    r.is_private,
    r.created_at,
    COALESCE(m.member_count, 0) AS member_count,
    COALESCE(f.favorite_count, 0) AS favorite_count,
    COALESCE(c.message_count, 0) AS message_count,
    c.latest_message_at
FROM rooms AS r
LEFT JOIN (
    SELECT room_id, COUNT(*) AS member_count
    FROM room_members
    GROUP BY room_id
) AS m ON m.room_id = r.room_id
LEFT JOIN (
    SELECT room_id, COUNT(*) AS favorite_count
    FROM room_favorites
    GROUP BY room_id
) AS f ON f.room_id = r.room_id
LEFT JOIN (
    SELECT room_id, COUNT(*) AS message_count, MAX(sent_at) AS latest_message_at
    FROM chat_messages
    WHERE is_deleted = FALSE
    GROUP BY room_id
) AS c ON c.room_id = r.room_id;

-- One row per user. Password hashes and other authentication secrets are omitted.
CREATE OR REPLACE VIEW vw_user_activity_summary AS
SELECT
    u.user_id,
    u.username,
    u.display_name,
    u.account_status,
    u.created_at AS user_created_at,
    COALESCE(ro.rooms_owned, 0) AS rooms_owned,
    COALESCE(rm.rooms_joined, 0) AS rooms_joined,
    COALESCE(cm.messages_sent, 0) AS messages_sent,
    cm.latest_message_at,
    COALESCE(fr.requests_sent, 0) AS friend_requests_sent,
    COALESCE(rr.requests_received, 0) AS friend_requests_received,
    COALESCE(fs.friends_count, 0) AS friends_count,
    COALESCE(rf.rooms_favorited, 0) AS rooms_favorited
FROM users AS u
LEFT JOIN (
    SELECT owner_id, COUNT(*) AS rooms_owned
    FROM rooms
    GROUP BY owner_id
) AS ro ON ro.owner_id = u.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) AS rooms_joined
    FROM room_members
    GROUP BY user_id
) AS rm ON rm.user_id = u.user_id
LEFT JOIN (
    SELECT sender_id, COUNT(*) AS messages_sent, MAX(sent_at) AS latest_message_at
    FROM chat_messages
    WHERE is_deleted = FALSE
    GROUP BY sender_id
) AS cm ON cm.sender_id = u.user_id
LEFT JOIN (
    SELECT sender_id, COUNT(*) AS requests_sent
    FROM friend_requests
    GROUP BY sender_id
) AS fr ON fr.sender_id = u.user_id
LEFT JOIN (
    SELECT receiver_id, COUNT(*) AS requests_received
    FROM friend_requests
    GROUP BY receiver_id
) AS rr ON rr.receiver_id = u.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) AS rooms_favorited
    FROM room_favorites
    GROUP BY user_id
) AS rf ON rf.user_id = u.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) AS friends_count
    FROM (
        SELECT user_id_1 AS user_id FROM friendships
        UNION ALL
        SELECT user_id_2 AS user_id FROM friendships
    ) AS friendship_pairs
    GROUP BY user_id
) AS fs ON fs.user_id = u.user_id;

-- ---------------------------------------------------------------------------
-- 2. Stored procedures
-- ---------------------------------------------------------------------------
-- These two DROP statements make reruns possible. They remove only the helper
-- routines defined below; they do not touch tables or data. Reapply any custom
-- EXECUTE grants on these routines after rerunning this script.
DROP PROCEDURE IF EXISTS sp_create_room_with_owner;
DROP PROCEDURE IF EXISTS sp_accept_friend_request;

-- Both procedures start and commit their own transactions. Call them only when
-- the session has no open transaction: START TRANSACTION implicitly commits
-- any transaction already active on that connection.
DELIMITER $$

-- Create a room and its owner membership as one atomic operation.
-- A successful call commits and returns the new room id through p_room_id.
CREATE PROCEDURE sp_create_room_with_owner(
    IN p_owner_id INT,
    IN p_room_name VARCHAR(100),
    IN p_description VARCHAR(255),
    IN p_is_private BOOLEAN,
    OUT p_room_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO rooms (owner_id, room_name, description, is_private)
    VALUES (p_owner_id, p_room_name, p_description, p_is_private);

    SET p_room_id = LAST_INSERT_ID();

    INSERT INTO room_members (room_id, user_id, member_role)
    VALUES (p_room_id, p_owner_id, 'owner');

    COMMIT;
END$$

-- Accept only a pending request addressed to p_receiver_id, then create the
-- canonical ordered friendship pair in the same transaction. Any error rolls
-- the request status change back as well as the friendship insert. If the pair
-- already exists, the primary-key violation rolls the request update back too.
CREATE PROCEDURE sp_accept_friend_request(
    IN p_request_id INT,
    IN p_receiver_id INT
)
BEGIN
    DECLARE v_sender_id INT DEFAULT NULL;
    DECLARE v_match_count INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*), MAX(sender_id)
      INTO v_match_count, v_sender_id
    FROM friend_requests
    WHERE request_id = p_request_id
      AND receiver_id = p_receiver_id
      AND request_status = 'pending';

    IF v_match_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No pending friend request for this receiver';
    END IF;

    IF v_sender_id = p_receiver_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A user cannot be friends with themselves';
    END IF;

    UPDATE friend_requests
    SET request_status = 'accepted', responded_at = CURRENT_TIMESTAMP
    WHERE request_id = p_request_id
      AND receiver_id = p_receiver_id
      AND request_status = 'pending';

    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Friend request changed before it could be accepted';
    END IF;

    INSERT INTO friendships (user_id_1, user_id_2)
    VALUES (LEAST(v_sender_id, p_receiver_id), GREATEST(v_sender_id, p_receiver_id));

    COMMIT;
END$$

-- ---------------------------------------------------------------------------
-- 3. Trigger
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_friend_requests_responded_at$$

-- Keep responded_at consistent whenever a pending request is answered. Reset
-- it when an application reopens a rejected/cancelled request as pending.
CREATE TRIGGER trg_friend_requests_responded_at
BEFORE UPDATE ON friend_requests
FOR EACH ROW
BEGIN
    IF NEW.request_status IN ('accepted', 'rejected', 'cancelled')
       AND (OLD.request_status <> NEW.request_status OR NEW.responded_at IS NULL) THEN
        SET NEW.responded_at = COALESCE(NEW.responded_at, CURRENT_TIMESTAMP);
    ELSEIF NEW.request_status = 'pending' THEN
        SET NEW.responded_at = NULL;
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 4. Transaction demonstration (manual, rollback-only)
-- ---------------------------------------------------------------------------
-- This example uses an existing pending request if one exists. It changes two
-- related tables inside a transaction, displays the tentative result, then
-- ROLLS BACK so the database is left unchanged. Run these statements manually
-- in a fresh session with no open transaction after selecting the database; do
-- not use CALL sp_accept_friend_request for this rollback demo because that
-- procedure commits on success. START TRANSACTION would commit an earlier open
-- transaction in the same session.
--
-- SET @demo_request_id = NULL;
-- SET @demo_sender_id = NULL;
-- SET @demo_receiver_id = NULL;
-- SELECT request_id, sender_id, receiver_id
-- INTO @demo_request_id, @demo_sender_id, @demo_receiver_id
-- FROM friend_requests
-- WHERE request_status = 'pending'
-- ORDER BY sent_at, request_id
-- LIMIT 1;
-- START TRANSACTION;
-- UPDATE friend_requests
-- SET request_status = 'accepted', responded_at = CURRENT_TIMESTAMP
-- WHERE request_id = @demo_request_id
--   AND request_status = 'pending';
-- INSERT IGNORE INTO friendships (user_id_1, user_id_2)
-- SELECT LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
-- FROM friend_requests
-- WHERE request_id = @demo_request_id
--   AND request_status = 'accepted'
--   AND sender_id <> receiver_id;
-- SELECT request_id, request_status, responded_at
-- FROM friend_requests WHERE request_id = @demo_request_id;
-- SELECT user_id_1, user_id_2
-- FROM friendships
-- WHERE user_id_1 = LEAST(@demo_sender_id, @demo_receiver_id)
--   AND user_id_2 = GREATEST(@demo_sender_id, @demo_receiver_id);
-- ROLLBACK;

-- ---------------------------------------------------------------------------
-- 5. Existing indexes and EXPLAIN examples
-- ---------------------------------------------------------------------------
-- These queries use existing indexes from the introspected schema:
--   idx_chat_room_time on chat_messages(room_id, sent_at)
--   PRIMARY KEY on room_members(room_id, user_id)
--   user_id index on room_members(user_id)
--   receiver_id index on friend_requests(receiver_id)
-- No indexes are added by this script. Small tables may lead the optimizer to
-- choose a table scan; EXPLAIN still shows the available access paths.
--
-- Chat history for one room and time window: inspect the key and access type.
EXPLAIN
SELECT message_id, sender_id, message_text, sent_at
FROM chat_messages
WHERE room_id = 1
  AND sent_at >= CURRENT_TIMESTAMP - INTERVAL 30 DAY
  AND is_deleted = FALSE
ORDER BY sent_at DESC
LIMIT 50;

-- Room members in primary-key order: the composite primary key begins with room_id.
EXPLAIN
SELECT room_id, user_id, member_role
FROM room_members
WHERE room_id = 1
ORDER BY user_id;

-- Requests addressed to a user: receiver_id has an existing secondary index.
EXPLAIN
SELECT request_id, sender_id, request_status, sent_at
FROM friend_requests
WHERE receiver_id = 1
ORDER BY sent_at DESC;

-- EXPLAIN the summary views as well as reading them to discuss their underlying joins.
EXPLAIN SELECT * FROM vw_room_statistics ORDER BY member_count DESC LIMIT 10;
EXPLAIN SELECT * FROM vw_user_activity_summary WHERE user_id = 1;
