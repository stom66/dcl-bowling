@echo off

:: Set a source folder relative to the path the script is run from.
set "sourceDir=..\dcl"

:: Set the target folder relative to the path the script is run from
:: Assuming this repo has been cloned next to the target repo, this should start with ..\..\
:: The default example here copies the contents of the dcl-scene folder and places them in
:: a subfolder called dcl-vroomway-solosprint-2
set "destinationDir=..\..\vroomway\src\solo-sprint-2"


:: Copy the files with robocopy, excluding the various folders listed below. Use ^ to split over multiple lines
robocopy "%sourceDir%" "%destinationDir%" /mir ^
	/xd ^
		"bin" ^
		"node_modules" ^
		"gltf" ^
		"glbfind" ^
		"images" ^
	/xf ^
		".dclignore" ^
		".eslintrc.json" ^
		".npmrc" ^
		".gitignore" ^
		"Dockerfile" ^
		"package.json" ^
		"package-lock.json" ^
		"scene.json" ^
		"tsconfig.json" ^
		"_bootstrap.ts" ^
		"dev.*.ts" ^
