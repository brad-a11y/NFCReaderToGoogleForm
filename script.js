document.addEventListener("DOMContentLoaded", () => {
    const scanButton = document.getElementById('scanButton');
    const abortButton = document.getElementById('abortButton');
    const nfcValueInput = document.getElementById('nfcValue');
    const logElement = document.getElementById('log');
    const statusElement = document.getElementById('status');

    let abortController;
    let scanInterval;

    // --- Main Logic: Check for Web NFC Support ---
    if ('NDEFReader' in window) {
        // --- Path 1: Web NFC is SUPPORTED ---
        logMessage("Web NFC is supported! Ready to scan.", "success");
        setupNfcReader();
    } else {
        // --- Path 2: Web NFC is NOT SUPPORTED (Mock Mode) ---
        logMessage("Web NFC not supported. Switched to Mock Mode.", "info");
        setupMockButton();
    }

    /**
     * Sets up all the event listeners for a browser that supports Web NFC.
     */
    function setupNfcReader() {
        scanButton.addEventListener('click', async () => {
            logMessage("User clicked 'Start Scan'.", "info");
            nfcValueInput.value = ""; // Clear previous value
            
            if (abortController) {
                abortController.abort();
            }
            abortController = new AbortController();
            
            scanButton.disabled = true;
            abortButton.disabled = false;
            
            let dotCount = 1;
            updateStatus("Scanning" + ".".repeat(dotCount));
            statusElement.className = 'status-scanning';
            scanInterval = setInterval(() => {
                dotCount = (dotCount % 3) + 1;
                updateStatus("Scanning" + ".".repeat(dotCount));
            }, 500);

            try {
                const reader = new NDEFReader();
                await reader.scan({ signal: abortController.signal });
                logMessage("✅ Scan started successfully! Bring a tag near the phone.", "scan");

                reader.addEventListener("reading", ({ message, serialNumber }) => {
                    logMessage(`> Tag detected! Physical Serial #: ${serialNumber}`, "success");
                    nfcValueInput.value = `${serialNumber}`;

                resetScanState();
                
                const record = message.records[0]; // Process the first record
                if (record) {
                    handleRecord(record);
                    submitToGoogleForm(`${serialNumber}`);
                    submitToOneTeam(`{"taskId": "1","jobId": "${serialNumber}","hoursCompleted": 7,"finished": false}`);
                    } else {
                        logMessage("Tag contains no NDEF records.", "error");
                    }
                });

                reader.addEventListener("error", (event) => {
                    logMessage("NFC Reader Error: " + event.message, "error");
                    resetScanState();
                });

            } catch (error) {
                logMessage(`Scan failed: ${error}`, "error");
                resetScanState();
            }
        });

        abortButton.addEventListener('click', () => {
            logMessage("User clicked 'Stop Scan'.", "info");
            if (abortController) {
                abortController.abort();
                resetScanState();
            }
        });
    }

    /**
     * Sets up a mock button for browsers that do not support Web NFC.
     */
    function setupMockButton() {
        scanButton.textContent = "Run Mock Scan";
        scanButton.addEventListener('click', () => {
            logMessage("User clicked 'Run Mock Scan'.", "info");

            // Generate a fake serial number
            const mockSerialNumber = `MOCK-${Date.now()}`;
            logMessage(`> Generated Mock Serial: ${mockSerialNumber}`, "success");
            
            // Create a mock NDEF record that looks like a real one
            const mockRecord = {
                recordType: "text",
                mediaType: "text/plain",
                id: null,
                // The data must be encoded into a Uint8Array, just like the real API provides
                data: new TextEncoder().encode(mockSerialNumber),
                encoding: "utf-8"
            };

            // Call the same handler that the real reader uses
            handleRecord(mockRecord);
        });
    }

    /**
     * Processes a received NDEF record (real or mock).
     * This function is now the central point for handling data.
     */
    function handleRecord(record) {
        logMessage(`>> Record Type: ${record.recordType}`);
        logMessage(`>> Media Type:  ${record.mediaType}`);
        
        let value = null;

        if (record.recordType === "text") {
            const textDecoder = new TextDecoder(record.encoding);
            value = textDecoder.decode(record.data);
            logMessage(`>> Decoded Text: ${value}`, "success");
        } else {
            logMessage(">> Record is not a 'text' record. Cannot process.", "info");
            return;
        }
        
        nfcValueInput.value = value;
        submitToGoogleForm(value);
        submitToOneTeam(`{"taskId": "1","jobId": "${value}","hoursCompleted": 7,"finished": false}`);

    }
    
    /**
     * Submits the captured data to the specified Google Form.
     * @param {string} serialNumber The value read from the NFC tag.
     */
    async function submitToOneTeam(jsonPayloadString){
        const webhookUrl = "https://ot.innovation.dev.oneteam.services/ai/api/webhooks/workspaces/1111/flows/aMjpgc3NRW00rbh4VxVNO";

        logMessage("Submitting data to OneTeam form...", "info");
        logMessage(jsonPayloadString, "info");
        const  bearerToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiT1QiLCJ0eXBlIjoidGVuYW50IiwiaWF0IjoxNzUyNTY2MDIxLCJleHAiOjE3NjgxMTgwMjF9.aBiJXxOdYj0_ogQSCucV__yQSUiDMCWcxvIJi-9QllXor11vScQOCrD4AbEiXEASVv73bU2DuDHo2b7Es3p30HQJuLSJ58HKke2Rr8ZbNsojRud6JjLoPYmTyFEGCTWZeEr1xP7_TG8YUbCYmnV5DgHkH4TuM7vt0Szbiw7RlwScrzwD-PzYNXSyvfVVDLQDaNF_nvmeQ-o68F1tq88lsEhLImlYO8DBwLATlELzgErmo985IG91a5Z4ENSKXb0TRIp_jgSU6rdxCguSp3ExfY7bRGIdeOIj4wlZqHneURTZjpKZxyjiJO2e_mtDMAM9QoASBKjINmlLiBnOjrer2Q";

        try {
            await fetch(webhookUrl, {
                method: "POST",
                body: jsonPayloadString,
                mode: "no-cors",
                headers: {
                    'Content-Type': 'application/json', // Indicate that the request body is JSON
                    'Authorization': `Bearer ${bearerToken}` // Include the Bearer Token in the Authorization header
                }
            });
            logMessage("✅ Data submitted successfully!", "success");
        } catch (error) {
            logMessage(`❌ Failed to submit data: ${error}`, "error");
        }
    }
                          
    async function submitToGoogleForm(serialNumber) {
        const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfqcU9LE0cvOXwF1lN_Ge-lLiAzQkC-KdsiTCafc7I4fhZajg/formResponse";
        const dateEntry = "entry.1741188331";
        const serialNumberEntry = "entry.531498804";

        const now = new Date();
        const formData = new FormData();
        formData.append(`${dateEntry}_year`, now.getFullYear());
        formData.append(`${dateEntry}_month`, String(now.getMonth() + 1).padStart(2, '0'));
        formData.append(`${dateEntry}_day`, String(now.getDate()).padStart(2, '0'));
        formData.append(`${dateEntry}_hour`, String(now.getHours()).padStart(2, '0'));
        formData.append(`${dateEntry}_minute`, String(now.getMinutes()).padStart(2, '0'));
        formData.append(serialNumberEntry, serialNumber);

        logMessage("Submitting data to Google Form...", "info");
        logMessage(`${serialNumberEntry}, ${serialNumber}`, "info");

        try {
            await fetch(formUrl, {
                method: "POST",
                body: formData,
                mode: "no-cors"
            });
            logMessage("✅ Data submitted successfully!", "success");
        } catch (error) {
            logMessage(`❌ Failed to submit data: ${error}`, "error");
        }
    }

    function resetScanState() {
        clearInterval(scanInterval);
        scanButton.disabled = false;
        abortButton.disabled = true;
        updateStatus("Status: Ready");
        statusElement.className = 'status-ready';
    }

    function updateStatus(message) {
        statusElement.innerHTML = `<p>${message}</p>`;
    }

    function logMessage(message, className = 'log-info') {
        const p = document.createElement('p');
        p.textContent = message;
        p.className = className;
        logElement.appendChild(p);
        logElement.scrollTop = logElement.scrollHeight;
    }
});
