# WhatDo: 
#
# Creates a new collection for each selected object
# Creates a new parent empty
# Moves the object and empty to that collection
# Parents the object to the empty with "no inverse" and "keep transform" options enabled
# The new collections are marked as assets.


import bpy

# Get the currently selected objects
selected_objects = bpy.context.selected_objects

# Create a new collection for each object and move the object to that collection
for obj in selected_objects:
    
    # Create the collection and name it after the object
    new_collection = bpy.data.collections.new(obj.name)
    bpy.context.scene.collection.children.link(new_collection)

    # Move the object to the new collection
    if obj.users_collection:
        obj_collection = obj.users_collection[0]  # Get the current collection of the object
        obj_collection.objects.unlink(obj)  # Remove the object from the current collection
        
    new_collection.objects.link(obj)  # Add the object to the new collection
    
    # Create a new empty
    empty = bpy.data.objects.new(obj.name + ".pivot", None)
    empty.location = obj.location

    # Move the empty to the new collection
    if empty.users_collection:
        empty_collection = empty.users_collection[0]  # Get the current collection of the empty
        empty_collection.objects.unlink(empty)  # Remove the empty from the current collection
        
    new_collection.objects.link(empty)  # Add the empty to the new collection
    
    # Parent the object to the empty with no inverse and keep transform
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    empty.select_set(True)
    bpy.context.view_layer.objects.active = empty
    bpy.ops.object.parent_no_inverse_set(keep_transform=True)
 
    
    # Mark the new collection as an asset
    new_collection.asset_mark()
