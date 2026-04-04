# WhatDo:
#
# Loops through every material loaded in the scene
#	Enables "Backface Culling"

import bpy

for i, mat in enumerate(bpy.data.materials):
	mat.use_backface_culling = True
