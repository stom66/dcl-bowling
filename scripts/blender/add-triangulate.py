# WhatDo:
#
# Loops through the currently selected objects:
# 	Adds a triangulate modifier
#

import bpy

for obj in bpy.context.selected_objects:
	if obj.type == 'MESH':
		modif_types = [ modifier.type for modifier in obj.modifiers ]
		if 'TRIANGULATE' not in modif_types:
			tri = obj.modifiers.new('Triangulate', 'TRIANGULATE')
			tri.keep_custom_normals = True
