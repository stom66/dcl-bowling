# WhatDo:
#
# Creates a curve from an array of co-ordinates
#
# HowToUse:
#   Edit the array below to include the desired corrds - may require
# 		multi-cursor editing an array imported from elsewhere, such as
#  		a TypeScript file
# 	Run the script
#
# Adapted from https://blender.stackexchange.com/questions/120074/

CYCLIC = True

import bpy
from mathutils import Vector

coords_list = [
    [0.00,  0, 1.0 ],
    [1.00,  0, 0.0 ],
    [0.00,  0, -1.0 ],
    [-1.00, 0, 0.0 ]
]

# make a new curve
crv = bpy.data.curves.new('curve', 'CURVE')
crv.dimensions = '3D'

# make a new spline in that curve
spline = crv.splines.new(type='NURBS')

# a spline point for each point
spline.points.add(len(coords_list)-1) # theres already one point by default

# assign the point coordinates to the spline points
for p, new_co in zip(spline.points, coords_list):
    p.co = (new_co + [1]) # (add nurbs weight)

# close curve if set above
if CYCLIC:
    spline.use_cyclic_u = True
    spline.use_cyclic_v = True

# make a new object with the curve
obj = bpy.data.objects.new('object_name', crv)
bpy.context.scene.collection.objects.link(obj)
