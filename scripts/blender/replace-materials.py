# WhatDo:
#
# Loops through all obvjects in the current scene and replaces materials specified in the mapping dict
#
# Loops through the currently selected objects:
#	Loops through each material
#		Checks if the material needs to be remapped
#		Re-maps if required

# NOTE: this approach can result in material slots being assigned null if the resulting material
# name doesn't exist

import bpy
import os



# define mapping of old material names to new material names
material_mapping = {
	"PiratesPack_TX": "dcl.PiratesPack_TX",
	"MiniTown_TX": "dcl.MiniTown_TX",
	"AvatarWearables_TX": "dcl.AvatarWearables_TX",
	# add more mappings as needed
}


# loop through all objects in the scene
for obj in bpy.context.scene.objects:
	# loop through all materials on the object
	for slot in obj.material_slots:
		if slot.material.name in material_mapping:
			# if the material is in the mapping, replace it with the new material
			new_material_name = material_mapping[slot.material.name]
			new_material = bpy.data.materials.get(new_material_name)

			# check the new material exists
			if new_material:
				print(obj.name + ": swapped " +  slot.material.name + " for " + new_material.name)
				slot.material = new_material
			else:
				print(obj.name + ": ERROR new material does not exist")


# loop through all materials in the current blend file and remove them if they have been remapped
for material in bpy.data.materials:
    if material.name in material_mapping:
        # if the material is in the mapping, remove it from the current blend file
        bpy.data.materials.remove(material)
