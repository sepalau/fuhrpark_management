<?php
error_reporting(0);
header('Content-Type: application/json');

$module_permise = ['vehicule', 'soferi', 'service', 'asigurari', 'viniete', 'anvelope', 'anvelope_schimb'];
$modul = isset($_GET['modul']) ? $_GET['modul'] : 'vehicule';
$metoda = $_SERVER['REQUEST_METHOD'];

if (!in_array($modul, $module_permise)) {
    ob_clean(); // Șterge orice spațiu gol accidental din fișier înainte de a trimite JSON
    echo json_encode(["status" => "error", "mesaj" => "Unbekanntes Modul!"]);
    exit;
}

$fisier_date = ($modul === 'anvelope_schimb') ? 'anvelope.json' : $modul . '.json';

function citesteDateSigur($fisier) {
    if (!file_exists($fisier)) return [];
    $continut = file_get_contents($fisier);
    if (empty(trim($continut))) return [];
    $date = json_decode($continut, true);
    return is_array($date) ? $date : [];
}

// 1. GET: Citire
if ($metoda === 'GET') {
    $date_iesire = citesteDateSigur($fisier_date);
    ob_clean(); // Protecție critică anti-cache/spații albe
    echo json_encode($date_iesire);
    exit;
}

// 2. POST: Salvare / Reifenwechsel
if ($metoda === 'POST') {
    $input_raw = file_get_contents('php://input');
    $date_primite = json_decode($input_raw, true);
    $lista = citesteDateSigur($fisier_date);

    if ($modul === 'anvelope_schimb') {
        $id_anvelopa = $date_primite['id'];
        foreach ($lista as &$anvelopa) {
            if ($anvelopa['id'] === $id_anvelopa) {
                if ($anvelopa['status_set'] === 'Montiert') {
                    $anvelopa['status_set'] = 'Gelagert';
                    $anvelopa['locatie'] = "Saisonales Lager - Regal";
                } else {
                    $anvelopa['status_set'] = 'Montiert';
                    $anvelopa['locatie'] = "Am Fahrzeug montiert";
                }
                file_put_contents($fisier_date, json_encode($lista, JSON_PRETTY_PRINT));
                ob_clean();
                echo json_encode(["status" => "success", "mesaj" => "Reifenwechsel erfolgreich durchgeführt!"]);
                exit;
            }
        }
        ob_clean();
        echo json_encode(["status" => "error", "mesaj" => "Reifensatz nicht gefunden."]);
        exit;
    }

    if ($modul === 'service') {
        $vehicule = citesteDateSigur('vehicule.json');
        foreach ($vehicule as &$vehicul) {
            if ($vehicul['inmat'] === $date_primite['masina']) {
                $vehicul['status'] = 'Im Service';
            }
        }
        file_put_contents('vehicule.json', json_encode($vehicule, JSON_PRETTY_PRINT));
    }

    $date_primite['id'] = uniqid();
    $lista[] = $date_primite;
    file_put_contents($fisier_date, json_encode($lista, JSON_PRETTY_PRINT));

    ob_clean();
    echo json_encode(["status" => "success", "mesaj" => "Datensatz erfolgreich gespeichert!"]);
    exit;
}

// 3. DELETE: Ștergere securizată
if ($metoda === 'DELETE') {
    $input_raw = file_get_contents('php://input');
    $cerere = json_decode($input_raw, true);
    $id_de_sters = $cerere['id'];

    $lista = citesteDateSigur($fisier_date);

    if ($modul === 'vehicule') {
        foreach ($lista as $v) {
            if ($v['id'] === $id_de_sters && $v['status'] === 'Verfügbar') {
                ob_clean();
                echo json_encode([
                    "status" => "error", 
                    "mesaj" => "Geschäftsregel: Dieses Fahrzeug hat den Status [Verfügbar]. Bitte ändern Sie den Status zuerst auf [Inaktiv]."
                ]);
                exit;
            }
        }
    }

    $lista_noua = array_filter($lista, function($item) use ($id_de_sters) {
        return $item['id'] !== $id_de_sters;
    });

    file_put_contents($fisier_date, json_encode(array_values($lista_noua), JSON_PRETTY_PRINT));
    ob_clean();
    echo json_encode(["status" => "success", "mesaj" => "Datensatz erfolgreich gelöscht!"]);
    exit;
}
?>