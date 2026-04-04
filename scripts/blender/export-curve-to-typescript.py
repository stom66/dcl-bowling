# WhatDo:
#
# Looks for an active curve
# 	Loops through the points on the curve
# 		Prints out interpolated points to a text file
#
# HowToUse:
#   Select your curve and run
#   View results in the log file

import bpy
from mathutils import geometry

# Specify the number of interpolated points to be used
INT_COUNT = 8

# Specify the accuracy of co-ords
DEC_PLACES = 3

# Specify a log file to use for the output - this will appear in blenders internal memory
LOG_PATH = "result"

###

# Check for the Log file
if LOG_PATH not in bpy.data.texts:
    LOG_TXT = bpy.data.texts.new(LOG_PATH)
else:
    LOG_TXT = bpy.data.texts[LOG_PATH]
    LOG_TXT.clear()

# Define a simple log function print to both the blender console, and the log file specified above
def log(message):
    print(message)
    LOG_TXT.write(message + '\n')

# Acquire a reference to the bezier points.
bez_curve = bpy.context.active_object
bez_points = bez_curve.data.splines[0].bezier_points

bez_len = len(bez_points)
i_range = range(1, bez_len-1, 1)

log("export let" + bez_curve.name + ":Vector3[] = [")
for i in i_range:

    # Get a list of points distributed along the curve.
    points_on_curve = geometry.interpolate_bezier(
        bez_points[i].co,
        bez_points[i].handle_right,
        bez_points[i+1].handle_left,
        bez_points[i+1].co,
        INT_COUNT)

    points_len = len(points_on_curve)
    j_range = range(0, points_len, 1)

    for j in j_range:
        x = round(points_on_curve[j].x, DEC_PLACES)
        y = round(points_on_curve[j].y, DEC_PLACES)
        if(abs(x) < 0.01):
            x = 0
        if(abs(y) < 0.01):
            y = 0
        log("\tnew Vector3(" + str(x) + ", 0" + ', ' + str(y) + '),' )

log("]")
