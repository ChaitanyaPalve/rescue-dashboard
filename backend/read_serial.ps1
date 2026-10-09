param(
    [string]$PortName = "COM12",
    [int]$BaudRate = 115200
)

try {
    $port = New-Object System.IO.Ports.SerialPort($PortName, $BaudRate, [System.IO.Ports.Parity]::None, 8, [System.IO.Ports.StopBits]::One)
    $port.ReadTimeout = 4000
    $port.Open()
    Write-Host "Opened $PortName at $BaudRate successfully. Listening for data..."
    
    $deadline = (Get-Date).AddSeconds(4)
    while ((Get-Date) -lt $deadline) {
        try {
            $line = $port.ReadLine()
            Write-Host "[$PortName RECEIVED]: $line"
        } catch [System.TimeoutException] {
            Write-Host "No line received within timeout."
            break
        } catch {
            Write-Host "Read error: $($_.Exception.Message)"
            break
        }
    }
    $port.Close()
} catch {
    Write-Host ("Failed to open " + $PortName + ": " + $_.Exception.Message)
}
