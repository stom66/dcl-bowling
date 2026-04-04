import bpy

i = 0
for ob in bpy.context.selected_objects :
    for cv in ob.animation_data.action.fcurves :
        if not cv.hide:
            for mod in cv.modifiers :
                if mod.type != 'NOISE' : continue        
                cv.modifiers.remove(mod)