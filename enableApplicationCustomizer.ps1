Import-Module Microsoft.Online.SharePoint.PowerShell

$adminUrl = "https://bham-admin.sharepoint.com"
$siteUrl  = "https://bham.sharepoint.com/sites/SBXUoBAuthorisedAbsenceApp"

Connect-SPOService -Url $adminUrl

Add-SPOSiteCollectionAppCatalog -Site $siteUrl