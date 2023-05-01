import rasterio
import numpy as np
from affine import Affine

# Open the original TIFF file...
print('Opening the file...')
im = rasterio.open('D:/Downloads/LATIF/c2030_clip_ProjectRaste_C (1).tif')

print(f'''
    Width: {im.width}
    Height: {im.height}
    # of Bands: {im.count}
    Dtypes: {im.dtypes}
    CRS: {im.crs}
    Transform: {im.transform}
''')

# Read the first band as a dataset (ds)
ds = im.read(1)
print(f'The unique pixel values in the dataset are: {np.unique(ds)}')

# Create a new TIFF file with the same dimensions, but with 3 bands (RGB). The
# new file will have the same CRS and transform information as the original
# file. Read about affine transformation matrices at the following links:
# - https://gdal.org/tutorials/geotransforms_tut.html
# - https://rasterio.readthedocs.io/en/stable/topics/transforms.html
with rasterio.open(
    'D:/Downloads/LATIF/new file.tif',
    'w',                     # Open the file for writing
    driver='GTiff',          # Use a driver that will write a GeoTIFF file
    width=im.width,          # The number of columns
    height=im.height,        # The number of rows
    count=3,                 # The number of bands (3 for an RGB image)
    dtype=im.dtypes[0],      # The type of data in the pixels (should be np.uint8)
    crs='EPSG:32611',        # The CRS
    #transform=im.transform,  # The affine transform information
    transform=Affine.from_gdal(332826.1957189260, 29.9910127789, 0.0000000000,
                               3810397.8685707375, 0.0000000000, -29.9931104747),
    nodata=255,                # The nodata (transparency) value
) as new_im:

    def get_color_component(val, component):
        '''
        Get the color component (0 = red, 1 = green, 2 = blue) for the given
        value (val).
        '''
        # The colors dictionary is a mapping from pixel values in the original
        # dataset to (R, G, B) values.
        colors = {
            0: (255, 255, 255),         # white
            3: (0, 100, 0),             # dark green
            4: (0, 255, 0),             # lime
            6: (34, 139, 34),           # forest green
            7: (218, 165, 32),          # golden rod
            9: (255, 255, 0),           # yellow
            14: (154, 205, 50),         # yellow green
            15: (238, 232, 170),        # pale golden rod
            16: (128, 128, 128),        # gray
            17: (255, 0, 0),            # red
            18: (0, 255, 255),          # aqua
            255: (255, 255, 255),       # white
        }
        return colors[val][component]

    vec_get_color_component = np.vectorize(get_color_component, otypes=[np.uint8])

    # Create a new dataset for each color component (red, green, blue). These
    # will be used to write the new bands to the new TIFF file.
    newds_r = vec_get_color_component(ds, 0)
    newds_g = vec_get_color_component(ds, 1)
    newds_b = vec_get_color_component(ds, 2)

    new_im.write(newds_r, 1)
    new_im.write(newds_g, 2)
    new_im.write(newds_b, 3)
