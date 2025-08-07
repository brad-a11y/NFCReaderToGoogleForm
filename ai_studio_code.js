document.addEventListener("DOMContentLoaded", () => {
    const scanButton = document.getElementById('scanButton');
    const nfcValueInput = document.getElementById('nfcValue');
    const logElement = document.getElementById('log');

    // Check if Web NFC is available in the browser
    if (!('NDEFReader' in window)) {
        logMessage("Web NFC is not supported on this browser.", "error");
        scanButton.disabled = true;
        return;
    }

    scanButton.addEventListener('click', async () => {
        logMessage("User clicked scan. Waiting for NFC tag...");
        nfcValueInput.value = ""; // Clear previous value

        try {
            // NDEFReader is the interface to read NFC tags
            const reader = new NDEFReader();
            
            // The scan() method returns a Promise that resolves when a scan is started.
            await reader.scan();
            logMessage("✅ Scan started successfully!");

            // Listen for the 'reading' event
            reader.addEventListener("reading", ({ message, serialNumber }) => {
                logMessage(`> Tag detected! Serial Number: ${serialNumber}`);

                // message.records is an array of NDEF records
                for (const record of message.records) {
                    logMessage(`>> Record Type: ${record.recordType}`);
                    logMessage(`>> Media Type:  ${record.mediaType}`);
                    logMessage(`>> Record ID:   ${record.id}`);

                    // We'll focus on 'text' records, which are the most common for simple data.
                    if (record.recordType === "text") {
                        const textDecoder = new TextDecoder(record.encoding);
                        const text = textDecoder.decode(record.data);
                        logMessage(`>> Decoded Text: ${text}`);
                        
                        // Write the value to our form input
                        nfcValueInput.value = text;
                        
                        // Optional: You could automatically submit the form here
                        // document.getElementById('nfcForm').submit();

                    } else {
                        logMessage(">> This record is not a 'text' record, skipping.");
                    }
                }
            });

            // Listen for any errors that may occur during the scan
            reader.addEventListener("error", (event) => {
                logMessage("Argh! An error occurred. " + event.message, "error");
            });

        } catch (error) {
            logMessage("Scan failed: " + error, "error");
        }
    });

    // Helper function to log messages to the screen
    function logMessage(message, type = 'info') {
        const p = document.createElement('p');
        p.textContent = message;
        if (type === 'error') {
            p.style.color = 'red';
        }
        logElement.appendChild(p);
        // Scroll to the bottom of the log
        logElement.scrollTop = logElement.scrollHeight;
    }
});