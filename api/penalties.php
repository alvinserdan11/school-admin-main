<?php
require_once "../db.php";
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $userId = $_GET["user_id"] ?? null;
    $sql = "
        SELECT p.*, u.first_name, u.last_name, u.id_number, e.name as equip_name
        FROM penalties p
        JOIN users u ON p.user_id = u.user_id
        JOIN transactions t ON p.transaction_id = t.transaction_id
        JOIN equipment e ON t.equipment_id = e.equipment_id
    ";
    if ($userId) {
        $sql .= " WHERE p.user_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
    } else {
        $stmt = $pdo->query($sql);
    }
    json($stmt->fetchAll());
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    $pdo->prepare("UPDATE penalties SET payment_status=?, date_settled=NOW() WHERE penalty_id=?")
        ->execute([$input["payment_status"], $input["penalty_id"]]);
    json(["success" => true]);
}
