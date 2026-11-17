-- MySQL dump 10.13  Distrib 8.0.33, for Win64 (x86_64)
--
-- Host: localhost    Database: online_hangout_space
-- ------------------------------------------------------
-- Server version	8.0.33

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `message_id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message_text` varchar(2000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`message_id`),
  KEY `sender_id` (`sender_id`),
  KEY `idx_chat_room_time` (`room_id`,`sent_at`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE,
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `friend_requests`
--

DROP TABLE IF EXISTS `friend_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `friend_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `request_status` enum('pending','accepted','rejected','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `uq_friend_request_pair` (`sender_id`,`receiver_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `friend_requests_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `friend_requests_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_not_self_request` CHECK ((`sender_id` <> `receiver_id`))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `friendships`
--

DROP TABLE IF EXISTS `friendships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `friendships` (
  `user_id_1` int NOT NULL,
  `user_id_2` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id_1`,`user_id_2`),
  KEY `user_id_2` (`user_id_2`),
  CONSTRAINT `friendships_ibfk_1` FOREIGN KEY (`user_id_1`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `friendships_ibfk_2` FOREIGN KEY (`user_id_2`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_friend_order` CHECK ((`user_id_1` < `user_id_2`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `furniture_catalog`
--

DROP TABLE IF EXISTS `furniture_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `furniture_catalog` (
  `furniture_id` int NOT NULL AUTO_INCREMENT,
  `item_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` enum('furniture','wallpaper','decoration') COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_price` decimal(8,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`furniture_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_favorites`
--

DROP TABLE IF EXISTS `room_favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_favorites` (
  `user_id` int NOT NULL,
  `room_id` int NOT NULL,
  `favorited_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`room_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `room_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `room_favorites_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_items`
--

DROP TABLE IF EXISTS `room_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_items` (
  `room_item_id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `furniture_id` int NOT NULL,
  `placed_by` int NOT NULL,
  `position_x` decimal(7,2) NOT NULL DEFAULT '0.00',
  `position_y` decimal(7,2) NOT NULL DEFAULT '0.00',
  `rotation_deg` smallint NOT NULL DEFAULT '0',
  `scale_factor` decimal(4,2) NOT NULL DEFAULT '1.00',
  `placed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`room_item_id`),
  KEY `room_id` (`room_id`),
  KEY `furniture_id` (`furniture_id`),
  KEY `placed_by` (`placed_by`),
  CONSTRAINT `room_items_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE,
  CONSTRAINT `room_items_ibfk_2` FOREIGN KEY (`furniture_id`) REFERENCES `furniture_catalog` (`furniture_id`),
  CONSTRAINT `room_items_ibfk_3` FOREIGN KEY (`placed_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_members`
--

DROP TABLE IF EXISTS `room_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_members` (
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `member_role` enum('owner','moderator','member') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`room_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `room_members_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE,
  CONSTRAINT `room_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `room_id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `room_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_private` tinyint(1) NOT NULL DEFAULT '1',
  `room_password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wallpaper` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default-blue',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`room_id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_message` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `account_status` enum('active','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vw_room_statistics`
--

DROP TABLE IF EXISTS `vw_room_statistics`;
/*!50001 DROP VIEW IF EXISTS `vw_room_statistics`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_room_statistics` AS SELECT 
 1 AS `room_id`,
 1 AS `room_name`,
 1 AS `owner_id`,
 1 AS `is_private`,
 1 AS `created_at`,
 1 AS `member_count`,
 1 AS `favorite_count`,
 1 AS `message_count`,
 1 AS `latest_message_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_user_activity_summary`
--

DROP TABLE IF EXISTS `vw_user_activity_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_user_activity_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_user_activity_summary` AS SELECT 
 1 AS `user_id`,
 1 AS `username`,
 1 AS `display_name`,
 1 AS `account_status`,
 1 AS `user_created_at`,
 1 AS `rooms_owned`,
 1 AS `rooms_joined`,
 1 AS `messages_sent`,
 1 AS `latest_message_at`,
 1 AS `friend_requests_sent`,
 1 AS `friend_requests_received`,
 1 AS `friends_count`,
 1 AS `rooms_favorited`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `watch_sessions`
--

DROP TABLE IF EXISTS `watch_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `watch_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `started_by` int NOT NULL,
  `video_title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `video_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `playback_position_seconds` int NOT NULL DEFAULT '0',
  `playback_status` enum('playing','paused','ended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'paused',
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `room_id` (`room_id`),
  KEY `started_by` (`started_by`),
  CONSTRAINT `watch_sessions_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE,
  CONSTRAINT `watch_sessions_ibfk_2` FOREIGN KEY (`started_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `vw_room_statistics`
--

/*!50001 DROP VIEW IF EXISTS `vw_room_statistics`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_room_statistics` AS select `r`.`room_id` AS `room_id`,`r`.`room_name` AS `room_name`,`r`.`owner_id` AS `owner_id`,`r`.`is_private` AS `is_private`,`r`.`created_at` AS `created_at`,coalesce(`m`.`member_count`,0) AS `member_count`,coalesce(`f`.`favorite_count`,0) AS `favorite_count`,coalesce(`c`.`message_count`,0) AS `message_count`,`c`.`latest_message_at` AS `latest_message_at` from (((`rooms` `r` left join (select `room_members`.`room_id` AS `room_id`,count(0) AS `member_count` from `room_members` group by `room_members`.`room_id`) `m` on((`m`.`room_id` = `r`.`room_id`))) left join (select `room_favorites`.`room_id` AS `room_id`,count(0) AS `favorite_count` from `room_favorites` group by `room_favorites`.`room_id`) `f` on((`f`.`room_id` = `r`.`room_id`))) left join (select `chat_messages`.`room_id` AS `room_id`,count(0) AS `message_count`,max(`chat_messages`.`sent_at`) AS `latest_message_at` from `chat_messages` where (`chat_messages`.`is_deleted` = false) group by `chat_messages`.`room_id`) `c` on((`c`.`room_id` = `r`.`room_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_user_activity_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_user_activity_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_user_activity_summary` AS select `u`.`user_id` AS `user_id`,`u`.`username` AS `username`,`u`.`display_name` AS `display_name`,`u`.`account_status` AS `account_status`,`u`.`created_at` AS `user_created_at`,coalesce(`ro`.`rooms_owned`,0) AS `rooms_owned`,coalesce(`rm`.`rooms_joined`,0) AS `rooms_joined`,coalesce(`cm`.`messages_sent`,0) AS `messages_sent`,`cm`.`latest_message_at` AS `latest_message_at`,coalesce(`fr`.`requests_sent`,0) AS `friend_requests_sent`,coalesce(`rr`.`requests_received`,0) AS `friend_requests_received`,coalesce(`fs`.`friends_count`,0) AS `friends_count`,coalesce(`rf`.`rooms_favorited`,0) AS `rooms_favorited` from (((((((`users` `u` left join (select `rooms`.`owner_id` AS `owner_id`,count(0) AS `rooms_owned` from `rooms` group by `rooms`.`owner_id`) `ro` on((`ro`.`owner_id` = `u`.`user_id`))) left join (select `room_members`.`user_id` AS `user_id`,count(0) AS `rooms_joined` from `room_members` group by `room_members`.`user_id`) `rm` on((`rm`.`user_id` = `u`.`user_id`))) left join (select `chat_messages`.`sender_id` AS `sender_id`,count(0) AS `messages_sent`,max(`chat_messages`.`sent_at`) AS `latest_message_at` from `chat_messages` where (`chat_messages`.`is_deleted` = false) group by `chat_messages`.`sender_id`) `cm` on((`cm`.`sender_id` = `u`.`user_id`))) left join (select `friend_requests`.`sender_id` AS `sender_id`,count(0) AS `requests_sent` from `friend_requests` group by `friend_requests`.`sender_id`) `fr` on((`fr`.`sender_id` = `u`.`user_id`))) left join (select `friend_requests`.`receiver_id` AS `receiver_id`,count(0) AS `requests_received` from `friend_requests` group by `friend_requests`.`receiver_id`) `rr` on((`rr`.`receiver_id` = `u`.`user_id`))) left join (select `room_favorites`.`user_id` AS `user_id`,count(0) AS `rooms_favorited` from `room_favorites` group by `room_favorites`.`user_id`) `rf` on((`rf`.`user_id` = `u`.`user_id`))) left join (select `friendship_pairs`.`user_id` AS `user_id`,count(0) AS `friends_count` from (select `friendships`.`user_id_1` AS `user_id` from `friendships` union all select `friendships`.`user_id_2` AS `user_id` from `friendships`) `friendship_pairs` group by `friendship_pairs`.`user_id`) `fs` on((`fs`.`user_id` = `u`.`user_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-17  9:12:02
