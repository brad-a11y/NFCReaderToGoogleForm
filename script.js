document.addEventListener("DOMContentLoaded", () => {
    const scanButton = document.getElementById('scanButton');
    const abortButton = document.getElementById('abortButton');
    const nfcValueInput = document.getElementById('nfcValue');
    const logElement = document.getElementById('log');
    const statusElement = document.getElementById('status');

    let abortController;
    let scanInterval;

    // Check for Web NFC availability
    if (!('NDEFReader' in window)) {
        logMessage("Web NFC is not supported on this browser.", "error");
        scanButton.disabled = true;
        return;
    } else {
        logMessage("Web NFC is supported! Ready to scan.", "success");
    }

    scanButton.addEventListener('click', async () => {
        logMessage("User clicked 'Start Scan'.", "info");
        nfcValueInput.value = ""; // Clear previous value
        
        // Abort any previous scan
        if (abortController) {
            abortController.abort();
        }
        abortController = new AbortController();
        
        scanButton.disabled = true;
        abortButton.disabled = false;
        
        // Start the scanning heartbeat
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
                logMessage(`> Tag detected! Serial Number: ${serialNumber}`, "success");
                nfcValueInput.value = serialNumber;

                resetScanState();
                
                const record = message.records[0]; // Process the first record
                if (record) {
                    handleRecord(record);
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

    function handleRecord(record) {
        logMessage(`>> Record Type: ${record.recordType}`);
        logMessage(`>> Media Type:  ${record.mediaType}`);
        
        switch (record.recordType) {
            case "text":
                const textDecoder = new TextDecoder(record.encoding);
                const text = textDecoder.decode(record.data);
                logMessage(`>> Decoded Text: ${text}`, "success");
                nfcValueInput.value = text;
                break;
            case "url":
                const urlDecoder = new TextDecoder();
                const url = urlDecoder.decode(record.data);
                logMessage(`>> Decoded URL: ${url}`, "success");
                nfcValueInput.value = url;
                break;
            default:
                logMessage(">> Tag contains a record that is not 'text' or 'url'.", "info");
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
