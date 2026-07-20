Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
Dim exitCode
exitCode = WshShell.Run("_open.bat", 1, True)
If exitCode <> 0 Then
    MsgBox "Failed to open the web page (exit code: " & exitCode & ")." & vbCrLf & vbCrLf & _
           "A console window should still be open with error details.", vbCritical, "Cooling Calculator - Error"
End If
