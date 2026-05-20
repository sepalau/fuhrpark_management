document.addEventListener('DOMContentLoaded', () => {
    // 1. SISTEM DE NAVIGARE INTELIGENTĂ SPA
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.getAttribute('data-target')).classList.add('active');
        });
    });

    // Validare automată a datelor introduse (Majuscule)
    document.getElementById('v_vin').addEventListener('input', function() { this.value = this.value.toUpperCase(); });
    document.getElementById('v_inmat').addEventListener('input', function() { this.value = this.value.toUpperCase(); });

    // Setare data minimă de azi pentru permisul șoferilor
    const azi = new Date().toISOString().split('T')[0];
    document.getElementById('s_expirare').min = azi;

    // 2. SISTEM DE ȘTERGERE GLOBALĂ
    window.stergeElement = function(modul, id) {
        if(confirm('Möchten Sie diesen Datensatz wirklich löschen?')) {
            fetch(`backend.php?modul=${modul}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            })
            .then(res => res.json())
            .then(raspuns => {
                alert(raspuns.mesaj);
                incarcaToateDatele(); 
            });
        }
    };

    // 3. REIFENWECHSEL ACTION
    window.schimbaAnvelope = function(id) {
        fetch(`backend.php?modul=anvelope_schimb`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        })
        .then(res => res.json())
        .then(raspuns => {
            alert(raspuns.mesaj);
            incarcaToateDatele();
        });
    };

    // 4. NOU: MODIFICARE STATUS VEHICUL DIRECT DIN LISTĂ
    window.schimbaStatusVehicul = function(id, statusCurent) {
        const nouStatus = prompt("Neuen Status eingeben (Verfügbar / Im Service / Inaktiv):", statusCurent);
        if (!nouStatus) return; // Dacă utilizatorul apasă pe Cancel, se oprește execuția

        const optiuniValide = ['Verfügbar', 'Im Service', 'Inaktiv'];
        if (!optiuniValide.includes(nouStatus)) {
            alert("Ungültiger Status! Bitte genau eingeben: Verfügbar, Im Service oder Inaktiv");
            return;
        }

        fetch(`backend.php?modul=vehicule_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, status: nouStatus })
        })
        .then(res => res.json())
        .then(raspuns => {
            alert(raspuns.mesaj);
            incarcaToateDatele(); // Reîncărcăm listele pentru a afișa noul status pe ecran
        });
    };

    // 5. POPULARE DROPDOWN-URI DINAMICE
    function populeazaDropdownuriMasini(vehicule) {
        const dropdowns = [
            document.getElementById('srv_masina'),
            document.getElementById('asig_masina'),
            document.getElementById('vin_masina'),
            document.getElementById('anv_masina')
        ];
        dropdowns.forEach(select => {
            if (!select) return;
            const valoareSalvata = select.value;
            select.innerHTML = '<option value="">-- Fahrzeug auswählen --</option>';
            if (vehicule && vehicule.length > 0) {
                vehicule.forEach(v => {
                    select.innerHTML += `<option value="${v.inmat}">${v.inmat} (${v.marca})</option>`;
                });
            }
            select.value = valoareSalvata;
        });
    }

    // 6. INCARCARE INDEPENDENTA (Anti-Cache prin Timestamp)
    window.incarcaModulMecanism = function(modul, idContainer, functieRandare) {
        const urlFaraCache = `backend.php?modul=${modul}&_ts=${new Date().getTime()}`;

        fetch(urlFaraCache)
            .then(res => {
                if (!res.ok) throw new Error("Server-Fehler");
                return res.json();
            })
            .then(date => {
                const container = document.getElementById(idContainer);
                if (!container) return;

                if (!Array.isArray(date)) {
                    container.innerHTML = '<p style="color: red;">JSON-Formatfehler.</p>';
                    return;
                }

                container.innerHTML = date.length === 0 ? '<p style="color: gray; font-style: italic;">Keine Einträge vorhanden.</p>' : '';
                date.forEach(item => {
                    container.innerHTML += functieRandare(item);
                });

                if (modul === 'vehicule') {
                    populeazaDropdownuriMasini(date);
                }
            })
            .catch(err => {
                console.error(`Fehler beim Laden des Moduls ${modul}:`, err);
                const container = document.getElementById(idContainer);
                if (container) container.innerHTML = '<p style="color: red;">Fehler beim Laden der Daten.</p>';
            });
    };

    window.incarcaToateDatele = function() {
        // Am adăugat butonul de status în șablonul vehiculului
        incarcaModulMecanism('vehicule', 'lista-vehicule', (i) => 
            `<div class="masina-card"><strong>${i.inmat}</strong> - ${i.marca} ${i.model} 
            <button class="btn-delete" onclick="stergeElement('vehicule', '${i.id}')">Löschen</button>
            <button class="btn-action" onclick="schimbaStatusVehicul('${i.id}', '${i.status}')">Status ändern</button>
            <br><small>FIN: ${i.vin} | KM: ${i.km} | Status: <strong>${i.status}</strong></small></div>`);
        
        incarcaModulMecanism('soferi', 'lista-soferi', (i) => 
            `<div class="masina-card"><strong>${i.nume}</strong> <button class="btn-delete" onclick="stergeElement('soferi', '${i.id}')">Löschen</button><br><small>Klasse: ${i.permis} | Ablaufdatum: ${i.expirare}</small></div>`);
        
        incarcaModulMecanism('service', 'lista-service', (i) => 
            `<div class="masina-card"><strong>${i.masina}</strong> - Typ: ${i.tip} <button class="btn-delete" onclick="stergeElement('service', '${i.id}')">Löschen</button><br><small>Nächster Service bei: ${i.urmator_km} KM | TÜV: ${i.tuv}</small></div>`);
        
        incarcaModulMecanism('asigurari', 'lista-asigurari', (i) => 
            `<div class="masina-card"><strong>${i.masina}</strong> - ${i.tip}: ${i.polita} <button class="btn-delete" onclick="stergeElement('asigurari', '${i.id}')">Löschen</button><br><small>Gültig von: ${i.de_la} bis ${i.expirare} | Kosten: ${i.cost} EUR</small></div>`);
        
        incarcaModulMecanism('viniete', 'lista-viniete', (i) => 
            `<div class="masina-card"><strong>${i.masina}</strong> - Vignette ${i.land} (${i.tip}) <button class="btn-delete" onclick="stergeElement('viniete', '${i.id}')">Löschen</button><br><small>Ablaufdatum: ${i.expirare}</small></div>`);
        
        incarcaModulMecanism('anvelope', 'lista-anvelope', (i) => 
            `<div class="masina-card"><strong>${i.masina}</strong> - Typ: ${i.tip} (${i.profil} mm) <button class="btn-delete" onclick="stergeElement('anvelope', '${i.id}')">Löschen</button><button class="btn-action" onclick="schimbaAnvelope('${i.id}')">Reifenwechsel</button><br><small>Lagerort: ${i.locatie} | Status: <strong>${i.status_set}</strong></small></div>`);
    };

    incarcaToateDatele();

    // 7. ATAȘARE FORMULARE (POST)
    function configureazaSalvare(idForm, modul, structuraDateFunc) {
        const formElement = document.getElementById(idForm);
        if(!formElement) return;

        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            fetch(`backend.php?modul=${modul}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(structuraDateFunc())
            }).then(r => r.json()).then(raspuns => {
                alert(raspuns.mesaj);
                if (raspuns.status !== 'error') {
                    formElement.reset();
                }
                incarcaToateDatele();
            }).catch(err => {
                alert("Fehler beim Speichern!");
            });
        });
    }

    configureazaSalvare('form-vehicule', 'vehicule', () => ({
        inmat: document.getElementById('v_inmat').value.toUpperCase(),
        vin: document.getElementById('v_vin').value.toUpperCase(),
        marca: document.getElementById('v_marca').value,
        model: document.getElementById('v_model').value,
        km: parseInt(document.getElementById('v_km').value),
        status: document.getElementById('v_status').value
    }));

    configureazaSalvare('form-soferi', 'soferi', () => ({
        nume: document.getElementById('s_nume').value,
        permis: document.getElementById('s_permis').value,
        expirare: document.getElementById('s_expirare').value
    }));

    configureazaSalvare('form-service', 'service', () => ({
        masina: document.getElementById('srv_masina').value,
        tip: document.getElementById('srv_tip').value,
        urmator_km: parseInt(document.getElementById('srv_urmator_km').value),
        tuv: document.getElementById('srv_tuv').value
    }));

    configureazaSalvare('form-asigurari', 'asigurari', () => ({
        masina: document.getElementById('asig_masina').value,
        tip: document.getElementById('asig_tip').value,
        polita: document.getElementById('asig_polita').value,
        de_la: document.getElementById('asig_de_la').value,
        expirare: document.getElementById('asig_pana').value,
        cost: parseFloat(document.getElementById('asig_cost').value)
    }));

    configureazaSalvare('form-viniete', 'viniete', () => ({
        masina: document.getElementById('vin_masina').value,
        land: document.getElementById('vin_land').value,
        tip: document.getElementById('vin_tip').value,
        expirare: document.getElementById('vin_expirare').value
    }));

    configureazaSalvare('form-anvelope', 'anvelope', () => ({
        masina: document.getElementById('anv_masina').value,
        tip: document.getElementById('anv_tip').value,
        profil: parseFloat(document.getElementById('anv_profil').value),
        locatie: document.getElementById('anv_locatie').value,
        status_set: "Montiert"
    }));
});