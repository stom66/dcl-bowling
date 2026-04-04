# WhatDo:
#
# Loops through the currently selected objects:
#	Disables the visible bounding box
# 	Enables rendering for the object
#	Sets the display_type to SOLID

import bpy

#show the bounds of objects
for obj in bpy.context.selected_objects:
	#Disable bounds
	obj.show_bounds = False

	#Show in render
	obj.hide_render = False

	# Enable solid view
	obj.display_type = 'SOLID'
