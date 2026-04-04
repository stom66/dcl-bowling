# WhatDo:
#
# Mostly a boilerplate used when getting rid of duplcate materials (black, black.001, black.002, etc)
#
# Loops through the currently selected objects:
#	Loops through each material
#		Get the name
#		Trim off the unwated bits (.00x, rename to lwoercase, etc)
#		Assign material to the end name

# NOTE: this approach can result in material slots being assigned null if the resulting material
# name doesn't exist

import bpy

#rename materials with . numbers
for obj in bpy.context.selected_objects:
	for num, m in list(enumerate(obj.material_slots)):
		if m.material:
			# Get the current name
			matName = m.material.name
			newName = matName

			# Trim anything after a "."
			if newName.find(".") > -1:
				newName = matName[:matName.find(".")]

			# Replace various strings if found
			newName = newName.replace("gltf", "glTF")
			newName = newName.replace("Dark", "_dark")
			newName = newName.replace("Light", "_light")
			newName = newName.replace("-", "_")
			newName = newName.replace("Emissive", "emit")

			# Log it
			print ("Remapping material: " + matName + " to " + newName)

			# Apply the new name
			m.material = bpy.data.materials.get(newName)
