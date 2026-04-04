# WhatDo:
#
# Sorts the materials currently stored in the blend file
# Why? Because having them out of order in the drop-down list is annoying AF

import bpy

def mySort(e):
	return e['name']

bpy.data.materials.sort(key=mySort)
