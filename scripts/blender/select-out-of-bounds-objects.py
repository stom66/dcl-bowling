import bpy

# Get the active collection
active_collection = bpy.context.view_layer.active_layer_collection.collection

# Loop through all objects in the active collection
for obj in active_collection.objects:
    # Get the object's bounding box
    bbox = obj.bound_box

    # Check if the bounding box extends past x64 or y64
    if any(co[0] > 64 or co[1] > 64 for co in bbox):
        # Select the object
        obj.select_set(True)
