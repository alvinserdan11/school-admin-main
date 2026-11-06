<?php
require_once "../db.php";
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $status = $_GET["status"] ?? "Pending";
    $stmt = $pdo->prepare("
        SELECT r.*, u.first_name, u.last_name, u.id_number, e.name as equip_name, e.serial_number,
            a.first_name as approver_first, a.last_name as approver_last
        FROM reservations r
        JOIN users u ON r.user_id = u.user_id
        JOIN equipment e ON r.equipment_id = e.equipment_id
        LEFT JOIN users a ON r.approved_by = a.user_id
        WHERE r.reservation_status = ?
        ORDER BY r.request_date DESC
    ");
    $stmt->execute([$status]);
    json($stmt->fetchAll());
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("
        INSERT INTO reservations (user_id, equipment_id, reserved_start_date, reserved_end_date, reservation_status)
        VALUES (?, ?, ?, ?, 'Pending')
    ");
    $stmt->execute([
        $input["user_id"],
        $input["equipment_id"],
        $input["reserved_start_date"],
        $input["reserved_end_date"]
    ]);
    json(["reservation_id" => $pdo->lastInsertId(), "success" => true]);
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    $reservationId = $input["reservation_id"];
    $action = $input["action"]; // "approve", "reject", "cancel"
    $adminId = $input["admin_id"] ?? 1;

    if ($action === "approve") {
        $pdo->prepare("UPDATE reservations SET reservation_status='Approved', approved_by=? WHERE reservation_id=?")
            ->execute([$adminId, $reservationId]);

        // Create transaction
        $res = $pdo->prepare("SELECT * FROM reservations WHERE reservation_id=?");
        $res->execute([$reservationId]);
        $req = $res->fetch();

        $settings = $pdo->query("SELECT default_loan_days FROM settings WHERE setting_id=1")->fetch();
        $loanDays = $settings["default_loan_days"] ?? 7;

        $stmt = $pdo->prepare("
            INSERT INTO transactions (reservation_id, user_id, equipment_id, checkout_date, expected_return_date, processed_by)
            VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), ?)
        ");
        $stmt->execute([$reservationId, $req["user_id"], $req["equipment_id"], $loanDays, $adminId]);

        json(["transaction_id" => $pdo->lastInsertId(), "success" => true]);
    } elseif ($action === "reject") {
        $pdo->prepare("UPDATE reservations SET reservation_status='Rejected', approved_by=? WHERE reservation_id=?")
            ->execute([$adminId, $reservationId]);
        json(["success" => true]);
    } elseif ($action === "cancel") {
        $pdo->prepare("UPDATE reservations SET reservation_status='Cancelled' WHERE reservation_id=?")
            ->execute([$reservationId]);
        json(["success" => true]);
    }
}
