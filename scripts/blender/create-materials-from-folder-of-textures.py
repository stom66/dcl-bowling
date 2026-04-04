import bpy
import os

# Set the directory containing the images relative to the blend file
img_dir = bpy.path.abspath("//tex/dev")

# Define a list of folder names to loop through
folder_names = ["Dark", "Green", "Light", "Orange", "Purple", "Red"]

# Loop through the folders
for folder_name in folder_names:
    folder_path = os.path.join(img_dir, folder_name)
    
    # Loop through the images in the folder
    for img_name in os.listdir(folder_path):
        if img_name.endswith(".jpg") or img_name.endswith(".png"):
            
            # Extract the image number from the filename
            img_num = img_name.split("_")[1]
            
            # Create a new material with the name "<foldername>.<imgnum>"
            mat_name = f"gltf.dev.{folder_name}.{img_num}"
            bpy.data.materials["gltf.dev"].copy().name = mat_name
            new_mat = bpy.data.materials[mat_name]
            
            # Update the "BaseColor" image texture node in the material to use the loaded image
            img_path = os.path.join(folder_path, img_name)
            tex = new_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].links[0].from_node
            tex.image = bpy.data.images.load(img_path)
