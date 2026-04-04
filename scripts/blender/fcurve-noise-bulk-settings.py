import bpy

i = 0
for ob in bpy.context.selected_objects :
    for cv in ob.animation_data.action.fcurves :
        if not cv.hide:
            for mod in cv.modifiers :
                if mod.type != 'NOISE' : continue
                i+=1
                mod.strength = 2
                
                #mod.phase    = 1.0
                mod.offset   = i * 80
                mod.scale    = 140
                mod.depth    = 2
                mod.use_restricted_range = True
                mod.frame_start = 0
                mod.frame_end   = 600
                mod.blend_in    = 15
                mod.blend_out   = 15