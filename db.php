<?php
// =====================================================
// Database connection for SchoolAdmin v2
// Update these values with your phpMyAdmin credentials
// =====================================================
$host = "localhost";
$dbname = "schooladmin";
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed"]);
    exit;
}

function json($data) {
    header("Content-Type: application/json");
    echo json_encode($data);
    exit;
}
?>
