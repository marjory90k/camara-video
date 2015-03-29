<?php
  error_reporting(0);

  $upload_dir = "images/";
  $img = $_POST['hidden_data'];

  $img = str_replace('data:image/png;base64,', '', $img);
  $img = str_replace(' ', '+', $img);
  $data = base64_decode($img);

  $file = $upload_dir . uniqid() . ".png";
  $success = file_put_contents($file, $data);

  header('Content-Type: application/json');

  if($success) {
    $data = array('url' => $file);
    echo json_encode($data);
  } else {
    $data = array('error' => "No fue posible subir la foto");
    echo json_encode($data);
  }
?>