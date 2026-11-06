<?php
require_once "../db.php";
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $id = $_GET["id"] ?? null;
    if ($id) {
        $stmt = $pdo->prepare("
            SELECT e.*, c.category_name, l.room_name_or_number,
                (SELECT COUNT(*) FROM transactions t WHERE t.equipment_id = e.equipment_id AND t.actual_return_date IS NULL) as on_loan
            FROM equipment e
            JOIN categories c ON e.category_id = c.category_id
            JOIN locations l ON e.location_id = l.location_id
            WHERE e.equipment_id = ?
        ");
        $stmt->execute([$id]);
        json($stmt->fetch());
    }
    $stmt = $pdo->query("
        SELECT e.*, c.category_name, l.room_name_or_number,
            (SELECT COUNT(*) FROM transactions t WHERE t.equipment_id = e.equipment_id AND t.actual_return_date IS NULL) as on_loan
        FROM equipment e
        JOIN categories c ON e.category_id = c.category_id
        JOIN locations l ON e.location_id = l.location_id
        ORDER BY e.equipment_id DESC
    ");
    json($stmt->fetchAll());
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("INSERT INTO equipment (category_id, location_id, name, serial_number, specifications, condition_status) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input["category_id"],
        $input["location_id"],
        $input["name"],
        $input["serial_number"],
        $input["specifications"] ?? "",
        $input["condition_status"] ?? "Good"
    ]);
    json(["equipment_id" => $pdo->lastInsertId(), "success" => true]);
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("UPDATE equipment SET category_id=?, location_id=?, name=?, serial_number=?, specifications=?, condition_status=? WHERE equipment_id=?");
    $stmt->execute([
        $input["category_id"],
        $input["location_id"],
        $input["name"],
        $input["serial_number"],
        $input["specifications"],
        $input["condition_status"],
        $input["equipment_id"]
    ]);
    json(["success" => true]);
}

if ($method === "DELETE") {
    $id = $_GET["id"] ?? 0;
    $pdo->prepare("DELETE FROM equipment WHERE equipment_id=?")->execute([$id]);
    json(["success" => true]);
}
