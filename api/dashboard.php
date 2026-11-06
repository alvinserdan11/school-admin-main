<?php
require_once "../db.php";

$totalEquip = $pdo->query("SELECT COUNT(*) as c FROM equipment")->fetch()["c"] ?? 0;
$totalUsers = $pdo->query("SELECT COUNT(*) as c FROM users WHERE role='Student'")->fetch()["c"] ?? 0;
$activeLoans = $pdo->query("SELECT COUNT(*) as c FROM transactions WHERE actual_return_date IS NULL")->fetch()["c"] ?? 0;
$overdueLoans = $pdo->query("SELECT COUNT(*) as c FROM transactions WHERE actual_return_date IS NULL AND expected_return_date < NOW()")->fetch()["c"] ?? 0;

// Pending reservations
$requests = $pdo->query("
    SELECT r.*, u.first_name, u.last_name, u.id_number, e.name as equip_name
    FROM reservations r
    JOIN users u ON r.user_id = u.user_id
    JOIN equipment e ON r.equipment_id = e.equipment_id
    WHERE r.reservation_status = 'Pending'
    ORDER BY r.request_date DESC
")->fetchAll();

// Active loans
$active = $pdo->query("
    SELECT t.*, u.first_name, u.last_name, e.name as equip_name, e.serial_number
    FROM transactions t
    JOIN users u ON t.user_id = u.user_id
    JOIN equipment e ON t.equipment_id = e.equipment_id
    WHERE t.actual_return_date IS NULL AND t.expected_return_date >= NOW()
    ORDER BY t.expected_return_date ASC
    LIMIT 5
")->fetchAll();

// Overdue
$overdue = $pdo->query("
    SELECT t.*, u.first_name, u.last_name, e.name as equip_name, e.serial_number
    FROM transactions t
    JOIN users u ON t.user_id = u.user_id
    JOIN equipment e ON t.equipment_id = e.equipment_id
    WHERE t.actual_return_date IS NULL AND t.expected_return_date < NOW()
    ORDER BY t.expected_return_date ASC
")->fetchAll();

// Recent penalties
$penalties = $pdo->query("
    SELECT p.*, u.first_name, u.last_name
    FROM penalties p
    JOIN users u ON p.user_id = u.user_id
    WHERE p.payment_status = 'Unpaid'
    ORDER BY p.created_at DESC
    LIMIT 5
")->fetchAll();

json([
    "stats" => [
        "total_equipment" => (int)$totalEquip,
        "total_students" => (int)$totalUsers,
        "active_loans" => (int)$activeLoans,
        "overdue" => (int)$overdueLoans
    ],
    "requests" => $requests,
    "active_loans" => $active,
    "overdue" => $overdue,
    "penalties" => $penalties
]);
