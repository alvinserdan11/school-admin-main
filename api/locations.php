<?php
require_once "../db.php";
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $stmt = $pdo->query("SELECT * FROM locations ORDER BY room_name_or_number ASC");
    json($stmt->fetchAll());
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("INSERT INTO locations (room_name_or_number) VALUES (?)");
    $stmt->execute([$input["room_name_or_number"]]);
    json(["location_id" => $pdo->lastInsertId(), "success" => true]);
}
