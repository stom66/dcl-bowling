# WhatDo:
#
# Adds a new master collections called "_exports"
# Loops through all files in the specified folder
# If file is a GLB then it's imported and given it's own colelction based on its file name#


import os
import bpy

# Specify the path to the folder containing the GLB files
folder_path = "C:\projects\dcl-boilerplate-scene\dcl\models\menu"
#folder_path = "//../../../dcl-scene/models"

# Get a list of all GLB files in the folder
glb_files = [f for f in os.listdir(folder_path) if f.endswith(".glb")]

# Create the parent collection
parent_collection_name = "_exports"
parent_collection = bpy.data.collections.new(parent_collection_name)
bpy.context.scene.collection.children.link(parent_collection)

# Loop through each GLB file and import it
for file in glb_files:
    file_path = os.path.join(folder_path, file)
    bpy.ops.import_scene.gltf(filepath=file_path)

    # Create a new collection and add the imported object to it
    collection_name = "_export." + os.path.splitext(file)[0]
    collection = bpy.data.collections.new(collection_name)
    parent_collection.children.link(collection)
    for obj in bpy.context.selected_objects:
        obj_collection = obj.users_collection[0]
        if obj_collection.name != collection_name:
            obj_collection.objects.unlink(obj)
            collection.objects.link(obj)
