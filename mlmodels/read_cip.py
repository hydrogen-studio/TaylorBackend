import csv
import json
 
def formatString(string) -> str:
    return string.replace("=", "").replace("\"", "").replace(".", "")
# Function to convert a CSV to JSON
# Takes the file paths as arguments
def make_json(csvFilePath, jsonFilePath):
     
    # create a dictionary
    data = {}
     
    # Open a csv reader called DictReader
    with open(csvFilePath, encoding='utf-8') as csvf:
        csvReader = csv.DictReader(csvf)
         
        # Convert each row into a dictionary
        # and add it to data
        for rows in csvReader:
             
            # Assuming a column named 'CIPCode' to
            # be the primary key
            cip_4 = formatString(rows['CIPCode'])
            if len(cip_4) == 4:
                key = cip_4
                del rows['CIPCode']
                rows["CIPFamily"] = formatString(rows["CIPFamily"])
                data[key] = rows
 
    # Open a json writer, and use the json.dumps()
    # function to dump data
    with open(jsonFilePath, 'w', encoding='utf-8') as jsonf:
        jsonf.write(json.dumps(data, indent=4))
         
# Driver Code
 
# Decide the two file paths according to your
# computer system
csvFilePath = r'./mlmodels/CIPCode2010.csv'
jsonFilePath = r'./mlmodels/CIP.json'
 
# Call the make_json function
make_json(csvFilePath, jsonFilePath)