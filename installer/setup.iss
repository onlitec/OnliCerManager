; =====================================================================
; Inno Setup 6 Script for OnliCert Manager
; Compiler: Inno Setup 6 (https://jrsoftware.org/isinfo.php)
; =====================================================================

#define MyAppName "OnliCert Manager"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "OnliCert Open Source Project"
#define MyAppURL "https://github.com/onlicert/manager"
#define MyAppExeName "OnliCert Manager.exe"

[Setup]
AppId={{D1A3F5B8-4E2A-4B9A-8C31-9F2D8E4A7B5C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE
OutputDir=..\dist-installer
OutputBaseFilename=OnliCert-Manager-Setup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\apps\desktop\dist-release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
