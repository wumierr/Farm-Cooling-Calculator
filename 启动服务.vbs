Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
Dim exitCode
exitCode = WshShell.Run("_start.bat", 1, True)
If exitCode <> 0 Then
    MsgBox "Service startup failed (exit code: " & exitCode & ")." & vbCrLf & vbCrLf & _
           "A console window should still be open with error details." & vbCrLf & _
           "If not, run _start.bat directly from the project folder.", vbCritical, "Cooling Calculator - Error"
End If
