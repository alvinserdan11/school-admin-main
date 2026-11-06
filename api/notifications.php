<?php
require_once "../db.php";
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $userId = $_GET["user_id"] ?? null;
    if ($userId) {
        $stmt = $pdo->prepare("
            SELECT * FROM notifications WHERE user_id = ? ORDER BY date_sent DESC
        ");
        $stmt->execute([$userId]);
    } else {
        $stmt = $pdo->query("SELECT * FROM notifications ORDER BY date_sent DESC");
    }
    json($stmt->fetchAll());
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, message_content) VALUES (?, ?)");
    $stmt->execute([$input["user_id"], $input["message_content"]]);
    json(["notification_id" => $pdo->lastInsertId(), "success" => true]);
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE notification_id=?")
        ->execute([$input["notification_id"]]);
    json(["success" => true]);
}
