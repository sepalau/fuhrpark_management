<?php
error_reporting(0);
header('Content-Type: application/json');

// Am adăugat 'vehicule_status' în lista modulelor permise
$module_permise = ['vehicule', 'soferi', 'service', 'asigurari', 'viniete', 'anvelope', 'anvelope_schimb', 'vehicule_status'];
$modul = isset($_GET['modul']) ? $_GET['modul'] : 'vehicule';
$metoda = $_SERVER['REQUEST_METHOD'];

if (!in_array($modul, $module_permise)) {
    ob_clean();
    echo json_encode(["status" => "error", "mesaj" => "Unbekanntes Modul!"]);
    exit;
}

// Maparea corectă a fișierelor JSON
$fisier_date = $modul . '.json';
if ($modul === 'anvelope_schimb') { $fisier_date = 'anvelope.json'; }
if ($modul === 'vehicule_status') { $fisier_date = 'vehicule.json'; }

function citesteDateSigur($fisier) {
    if (!file_exists($fisier)) return [];
    $continut = file_get_contents($fisier);
    if (empty(trim($continut))) return [];
    $date = json_decode($continut, true);
    return is_array($date) ? $date : [];
}

// 1. GET: Citire date
if ($metoda === 'GET') {
    $date_iesire = citesteDateSigur($fisier_date);
    ob_clean();
    echo json_encode($date_iesire);
    exit;
}

// 2. POST: Salvare, Schimbare Anvelope sau Schimbare Status Vehicul
if ($metoda === 'POST') {
    $input_raw = file_get_contents('php://input');
    $date_primite = json_decode($input_raw, true);
    $lista = citesteDateSigur($fisier_date);

    // ACȚIUNEA NOUĂ: Modificarea statusului unei mașini direct din listă
    if ($modul === 'vehicule_status') {
        $id_vehicul = $date_primite['id'];
        $nou_status = $date_primite['status'];
        
        foreach ($lista as &$v) {
            if ($v['id'] === $id_vehicul) {
                $v['status'] = $nou_status;
                file_put_contents($fisier_date, json_encode($lista, JSON_PRETTY_PRINT));
                ob_clean();
                echo json_encode(["status" => "success", "mesaj" => "Fahrzeugstatus erfolgreich aktualisiert!"]);
                exit;
            }
        }
        ob_clean();
        echo json_encode(["status" => "error", "mesaj" => "Fahrzeug nicht gefunden."]);
        exit;
    }

    // ACȚIUNEA REIFENWECHSEL
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

    // VALIDARE CRITICĂ: Prevenirea duplicatelor pentru vehicule (Kennzeichen și FIN/VIN)
    if ($modul === 'vehicule') {
        foreach ($lista as $v) {
            if (strcasecmp($v['inmat'], $date_primite['inmat']) == 0) {
                ob_clean();
                echo json_encode(["status" => "error", "mesaj" => "Fehler: Ein Fahrzeug mit diesem Kennzeichen existiert bereits!"]);
                exit;
            }
            if (strcasecmp($v['vin'], $date_primite['vin']) == 0) {
                ob_clean();
                echo json_encode(["status" => "error", "mesaj" => "Fehler: Ein Fahrzeug mit dieser FIN/Fahrgestellnummer existiert bereits!"]);
                exit;
            }
        }
    }

    // Actualizare automată status când se adaugă o fișă de service
    if ($modul === 'service') {
        $vehicule = citesteDateSigur('vehicule.json');
        foreach ($vehicule as &$vehicul) {
            if ($vehicul['inmat'] === $date_primite['masina']) {
                $vehicul['status'] = 'Im Service';
            }
        }
        file_put_contents('vehicule.json', json_encode($vehicule, JSON_PRETTY_PRINT));
    }

    // Salvarea standard în caz că trece de validări
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