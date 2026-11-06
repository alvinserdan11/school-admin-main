<?php
require_once "../db.php";

// Category stats
$categoryStats = $pdo->query("
    SELECT c.category_name,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN t.actual_return_date IS NOT NULL THEN 1 ELSE 0 END) as returned,
        SUM(CASE WHEN t.actual_return_date IS NULL AND t.expected_return_date >= NOW() THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN t.actual_return_date IS NULL AND t.expected_return_date < NOW() THEN 1 ELSE 0 END) as overdue
    FROM transactions t
    JOIN equipment e ON t.equipment_id = e.equipment_id
    JOIN categories c ON e.category_id = c.category_id
    GROUP BY c.category_id, c.category_name
")->fetchAll();

// Monthly stats (last 6 months)
$monthly = $pdo->query("
    SELECT DATE_FORMAT(checkout_date, '%b') as month,
        COUNT(*) as borrowed,
        SUM(CASE WHEN actual_return_date IS NOT NULL THEN 1 ELSE 0 END) as returned
    FROM transactions
    WHERE checkout_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(checkout_date, '%Y-%m')
    ORDER BY checkout_date ASC
")->fetchAll();

$totalLoans = $pdo->query("SELECT COUNT(*) as c FROM transactions")->fetch()["c"] ?? 0;
$returnedLoans = $pdo->query("SELECT COUNT(*) as c FROM transactions WHERE actual_return_date IS NOT NULL")->fetch()["c"] ?? 0;
$activeLoans = $pdo->query("SELECT COUNT(*) as c FROM transactions WHERE actual_return_date IS NULL")->fetch()["c"] ?? 0;
$overdueLoans = $pdo->query("SELECT COUNT(*) as c FROM transactions WHERE actual_return_date IS NULL AND expected_return_date < NOW()")->fetch()["c"] ?? 0;

json([
    "category_stats" => $categoryStats,
    "monthly" => $monthly,
    "summary" => [
        "total" => (int)$totalLoans,
        "returned" => (int)$returnedLoans,
        "active" => (int)$activeLoans,
        "overdue" => (int)$overdueLoans
    ]
]);
