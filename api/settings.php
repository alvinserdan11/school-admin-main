<?php
require_once "../db.php";
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $stmt = $pdo->query("SELECT * FROM settings WHERE setting_id=1");
    json($stmt->fetch());
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("
        UPDATE settings SET
            school_name=?, school_email=?, admin_name=?,
            default_loan_days=?, max_loans_per_user=?,
            reminders=?, overdue_alerts=?, weekly_summary=?
        WHERE setting_id=1
    ");
    $stmt->execute([
        $input["school_name"],
        $input["school_email"],
        $input["admin_name"],
        $input["default_loan_days"],
        $input["max_loans_per_user"],
        $input["reminders"] ? 1 : 0,
        $input["overdue_alerts"] ? 1 : 0,
        $input["weekly_summary"] ? 1 : 0
    ]);
    json(["success" => true]);
}
