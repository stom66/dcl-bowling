# WhatDo:
#
# Loops through the currently selected objects:
# 	Adds a rigid body
#   Sets shape to convex hull
#   Calculates mass
#

import bpy

for obj in bpy.context.selected_objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj

        if not obj.rigid_body:
            bpy.ops.rigidbody.objects_add()

        bpy.ops.rigidbody.mass_calculate(material='Brick (Common)')
        bpy.ops.rigidbody.shape_change(type='CONVEX_HULL')

        obj.rigid_body.collision_margin = 0.005
        obj.rigid_body.friction = 0.75
        obj.rigid_body.restitution = 0.005 # bounciness

        obj.rigid_body.type = 'ACTIVE'
