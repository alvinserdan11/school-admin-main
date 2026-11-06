<?php
require_once "../db.php";
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $role = $_GET["role"] ?? null;
    $sql = "SELECT user_id, id_number, first_name, last_name, email, contact_number, grade, class, role, account_status FROM users";
    if ($role) {
        $sql .= " WHERE role = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$role]);
    } else {
        $stmt = $pdo->query($sql);
    }
    json($stmt->fetchAll());
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("INSERT INTO users (id_number, first_name, last_name, email, contact_number, grade, class, role, account_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input["id_number"],
        $input["first_name"],
        $input["last_name"],
        $input["email"],
        $input["contact_number"] ?? "",
        $input["grade"] ?? "",
        $input["class"] ?? "",
        $input["role"] ?? "Student",
        $input["account_status"] ?? "Active"
    ]);
    json(["user_id" => $pdo->lastInsertId(), "success" => true]);
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("UPDATE users SET first_name=?, last_name=?, id_number=?, email=?, contact_number=?, grade=?, class=?, role=?, account_status=? WHERE user_id=?");
    $stmt->execute([
        $input["first_name"],
        $input["last_name"],
        $input["id_number"],
        $input["email"],
        $input["contact_number"],
        $input["grade"] ?? "",
        $input["class"] ?? "",
        $input["role"],
        $input["account_status"],
        $input["user_id"]
    ]);
    json(["success" => true]);
}

if ($method === "DELETE") {
    $id = $_GET["id"] ?? 0;
    $pdo->prepare("DELETE FROM users WHERE user_id=?")->execute([$id]);
    json(["success" => true]);
}
