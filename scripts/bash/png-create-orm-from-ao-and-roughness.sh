#!/bin/bash


# EG
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric001/PanelGeneric001_AO_1K.png assets/tex/PanelGeneric001/PanelGeneric001_ROUGH_1K.png assets/tex/PanelGeneric001/PanelGeneric001_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric002/PanelGeneric002_AO_1K.png assets/tex/PanelGeneric002/PanelGeneric002_ROUGH_1K.png assets/tex/PanelGeneric002/PanelGeneric002_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric003/PanelGeneric003_AO_1K.png assets/tex/PanelGeneric003/PanelGeneric003_ROUGH_1K.png assets/tex/PanelGeneric003/PanelGeneric003_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric004/PanelGeneric004_AO_1K.png assets/tex/PanelGeneric004/PanelGeneric004_ROUGH_1K.png assets/tex/PanelGeneric004/PanelGeneric004_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric005/PanelGeneric005_AO_1K.png assets/tex/PanelGeneric005/PanelGeneric005_ROUGH_1K.png assets/tex/PanelGeneric005/PanelGeneric005_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric006/PanelGeneric006_AO_1K.png assets/tex/PanelGeneric006/PanelGeneric006_ROUGH_1K.png assets/tex/PanelGeneric006/PanelGeneric006_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric007/PanelGeneric007_AO_1K.png assets/tex/PanelGeneric007/PanelGeneric007_ROUGH_1K.png assets/tex/PanelGeneric007/PanelGeneric007_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric008/PanelGeneric008_AO_1K.png assets/tex/PanelGeneric008/PanelGeneric008_ROUGH_1K.png assets/tex/PanelGeneric008/PanelGeneric008_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric009/PanelGeneric009_AO_1K.png assets/tex/PanelGeneric009/PanelGeneric009_ROUGH_1K.png assets/tex/PanelGeneric009/PanelGeneric009_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric010/PanelGeneric010_AO_1K.png assets/tex/PanelGeneric010/PanelGeneric010_ROUGH_1K.png assets/tex/PanelGeneric010/PanelGeneric010_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/PanelGeneric011/PanelGeneric011_AO_1K.png assets/tex/PanelGeneric011/PanelGeneric011_ROUGH_1K.png assets/tex/PanelGeneric011/PanelGeneric011_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/RockDark002/RockDark002_AO_1K.png assets/tex/RockDark002/RockDark002_ROUGH_1K.png assets/tex/RockDark002/RockDark002_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/RockDark010/RockDark010_AO_1K.png assets/tex/RockDark010/RockDark010_ROUGH_1K.png assets/tex/RockDark010/RockDark010_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/RockDark011/RockDark011_AO_1K.png assets/tex/RockDark011/RockDark011_ROUGH_1K.png assets/tex/RockDark011/RockDark011_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/RockDark012/RockDark012_AO_1K.png assets/tex/RockDark012/RockDark012_ROUGH_1K.png assets/tex/RockDark012/RockDark012_ORM_1K.png
#scripts/png-create-orm-from-ao-and-roughness.sh assets/tex/RockGrey018/RockGrey018_AO_1K.png assets/tex/RockGrey018/RockGrey018_ROUGH_1K.png assets/tex/RockGrey018/RockGrey018_ORM_1K.png





# Check if three input parameters are provided
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 AO.png ROUGHNESS.png output.png" >&2
  exit 1
fi


convert "$1" "$2" -background black -channel RG -combine "$3"

echo "Images combined successfully. Output file: $3"
