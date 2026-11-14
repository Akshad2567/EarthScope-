
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats
import pymannkendall as mk

# PROJECT INFORMATION
PROJECT_NAME = "TerraTrend AI"

LOCATION = "Raipur, Chhattisgarh, India"

LATITUDE = 21.2514
LONGITUDE = 81.6296

START_YEAR = 2015
END_YEAR = 2025

VARIABLE = "Land Surface Temperature"

# APPLICATION START
def main():

    print("=" * 45)
    print("       WELCOME TO TERRATREND AI")
    print("=" * 45)

    print("Project:", PROJECT_NAME)
    print("Location:", LOCATION)
    print("Latitude:", LATITUDE)
    print("Longitude:", LONGITUDE)
    print("Study Period:", START_YEAR, "-", END_YEAR)
    print("Variable:", VARIABLE)

    print("\nProject environment initialized!")
    print("Next: NASA MODIS data integration.")

if __name__ == "__main__":
    main()
