<?php
require_once "../db.php";
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $status = $_GET["status"] ?? null;
    $userId = $_GET["user_id"] ?? null;
    $equipId = $_GET["equipment_id"] ?? null;

    $sql = "
        SELECT t.*, u.first_name, u.last_name, u.id_number, e.name as equip_name, e.serial_number,
            p.penalty_id, p.amount_due, p.payment_status as penalty_status
        FROM transactions t
        JOIN users u ON t.user_id = u.user_id
        JOIN equipment e ON t.equipment_id = e.equipment_id
        LEFT JOIN penalties p ON t.transaction_id = p.transaction_id
        WHERE 1=1
    ";
    $params = [];

    if ($status === "active") {
        $sql .= " AND t.actual_return_date IS NULL";
    } elseif ($status === "overdue") {
        $sql .= " AND t.actual_return_date IS NULL AND t.expected_return_date < NOW()";
    } elseif ($status === "returned") {
        $sql .= " AND t.actual_return_date IS NOT NULL";
    }
    if ($userId) {
        $sql .= " AND t.user_id = ?";
        $params[] = $userId;
    }
    if ($equipId) {
        $sql .= " AND t.equipment_id = ?";
        $params[] = $equipId;
    }

    $sql .= " ORDER BY t.checkout_date DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json($stmt->fetchAll());
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    $settings = $pdo->query("SELECT default_loan_days FROM settings WHERE setting_id=1")->fetch();
    $loanDays = $settings["default_loan_days"] ?? 7;

    $stmt = $pdo->prepare("
        INSERT INTO transactions (user_id, equipment_id, expected_return_date, processed_by)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?)
    ");
    $stmt->execute([$input["user_id"], $input["equipment_id"], $loanDays, $input["processed_by"] ?? 1]);
    json(["transaction_id" => $pdo->lastInsertId(), "success" => true]);
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    $transactionId = $input["transaction_id"];

    if (isset($input["actual_return_date"])) {
        $pdo->prepare("UPDATE transactions SET actual_return_date=NOW(), return_condition=? WHERE transaction_id=?")
            ->execute([$input["return_condition"] ?? "Good", $transactionId]);

        // Check for overdue and create penalty if needed
        $stmt = $pdo->prepare("SELECT * FROM transactions WHERE transaction_id=?");
        $stmt->execute([$transactionId]);
        $txn = $stmt->fetch();

        if ($txn && $txn["expected_return_date"] < date("Y-m-d H:i:s")) {
            $daysLate = floor((strtotime("now") - strtotime($txn["expected_return_date"])) / 86400);
            $amount = $daysLate * 2.00; // $2 per day late
            $pdo->prepare("INSERT INTO penalties (transaction_id, user_id, amount_due, reason, payment_status) VALUES (?, ?, ?, ?, 'Unpaid')")
                ->execute([$transactionId, $txn["user_id"], $amount, "Late return by " . $daysLate . " days"]);
        }
    }
    json(["success" => true]);
}
