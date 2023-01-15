import re
import json

with open('peano.mm') as f:
    data = f.read()

mmWithoutComments = re.sub(r'\$\((.|\r\n|\r|\n)*?\$\)', '', data)
mmWithoutComments = re.sub('\n+', '\n', mmWithoutComments)
mmWithoutComments = mmWithoutComments.strip()

constants = []
variables = []
disjointVariables = []
floatingHypotheses = []
essentialHypotheses = []
axiomaticAssertions = []
provableAssertions = []
blocks = []

formattedLines = mmWithoutComments.splitlines(True)
insideABlock = False

for line in formattedLines:
    targetArray = None
    if '${' not in line and not insideABlock:
        if '$c' in line:
            targetArray = constants
        elif '$v' in line:
            targetArray = variables
        elif '$d' in line:
            targetArray = disjointVariables
        elif '$f' in line:
            targetArray = floatingHypotheses
        elif '$e' in line:
            targetArray = essentialHypotheses
        elif '$a' in line:
            targetArray = axiomaticAssertions
        elif '$p' in line:
            targetArray = provableAssertions
        if targetArray is not None:
            if '$.' not in line:
                index = formattedLines.index(line) + 1
                multipleLines = line
                for x in range(index, len(formattedLines)):
                    if '$.' not in formattedLines[x]:
                        multipleLines+= formattedLines[x]
                    else:
                        multipleLines+= formattedLines[x]
                        targetArray.append(multipleLines)
                        break
                continue
            else:
                targetArray.append(line)
    else:
        insideABlock = '$}' not in line
        if '${' in line:
            blockLines = line
        else:
            blockLines += line
            if insideABlock == False:
                blocks.append(blockLines)
                

def argumentLineSplitByWhitespace(startIdentifier, initArray, array = [], endIdentifier = '$.' ):
    for line in initArray:
        startIdx = line.rfind(startIdentifier) + len(startIdentifier)
        endIdx = line.rfind(endIdentifier)
        lineWithoutIdentifiers = line[startIdx:endIdx]
        lineWithoutIdentifiers = lineWithoutIdentifiers.strip()
        array = array + lineWithoutIdentifiers.split()
    return array

def getFloatingHypOrAxiomaticAssert(initArray, identidfier):
    array = []
    for line in initArray:
        startIdx = line.rfind(identidfier)
        endIdx = line.rfind('$.')
        argName = line[:startIdx]
        argValue = line[startIdx + 2:endIdx]
        array = array + [argName+argValue.strip()]
    return array

parsedConstants = argumentLineSplitByWhitespace('$c', constants)
parsedVariables = argumentLineSplitByWhitespace('$v', variables)
parsedFloatingHypotheses = getFloatingHypOrAxiomaticAssert(floatingHypotheses, '$f')
parsedAxiomaticAssertions = getFloatingHypOrAxiomaticAssert(axiomaticAssertions, '$a')

def getJsonConstOrVar(val, group):
    array = []
    for idx, value in enumerate(val):
        array.append({ "id": f'{group}{idx}', "name": value, "group": group })
        
    return array

def getJsonFloatingHypOrAxiomaticAssert(val, group):
    array = []
    for value in val:
        nameAndVal = value.split(" ", 1)
        if group == 'axiomaticAssertion':
            floatingHypothesesNames.append(nameAndVal[0])
        array.append({ "id": nameAndVal[0], "name": nameAndVal[1], "group": group })
        
    return array

floatingHypothesesNames = []
jsonConstants = getJsonConstOrVar(parsedConstants, 'constant')
jsonVariables = getJsonConstOrVar(parsedVariables, 'variable')
jsonFloatingHypotheses = getJsonFloatingHypOrAxiomaticAssert(parsedFloatingHypotheses, 'floatingHypothesis')
jsonAxiomaticAssertions = getJsonFloatingHypOrAxiomaticAssert(parsedAxiomaticAssertions, 'axiomaticAssertion')

def findFloatingHypothesesAndAxiomaticAssertionsEdges(findFrom, constants, variables, group, floatingHypotheses = []):
    parents = []
    for line in findFrom:
        children = []
        [id, values] = line.split(" ", 1)
        if '|-' in values:
            idx = constants.index('|-') if '|-' in constants else None
            if idx is not None:
                if {"name": constants[idx], "group": "constants"} not in children:
                    children += [{"name": constants[idx], "value": ["$c "+constants[idx]+ " $."],"group": "constants"}]
        valueArray = values.split()
        for value in valueArray:
            idx = floatingHypotheses.index(value) if value in floatingHypotheses else None
            if idx is not None:
                if {"name": floatingHypotheses[idx][0], "value": [floatingHypotheses[idx][0]+" $f "+floatingHypotheses[idx][1]+ " $."], "group": "floatingHypotheses"} not in children:
                    children += [{"name": floatingHypotheses[idx][0], "value": [floatingHypotheses[idx][0]+" $f "+floatingHypotheses[idx][1]+ " $."], "group": "floatingHypotheses"}]
                    continue
            idx = constants.index(value) if value in constants else None
            if idx is not None:
                if {"name": constants[idx],  "value": ["$c "+constants[idx]+ " $."], "group": "constants"} not in children:
                    children += [{"name": constants[idx],  "value": ["$c "+constants[idx]+ " $."], "group": "constants"}]
                    continue
            idx = variables.index(value) if value in variables else None
            if idx is not None:
                if {"name": variables[idx], "value": ["$v "+variables[idx]+ " $."], "group": "variables"} not in children:
                    children += [{"name": variables[idx], "value": ["$v "+variables[idx]+ " $."], "group": "variables"}]
                    continue
        if group == "floatingHypotheses":
            parents += [{"name":id,"group":group, "value":[id+" $f "+values+ " $."], "children":children}]
        else:
            parents += [{"name":id,"group":group, "value":[id+" $a "+values+ " $."], "children":children}]
    return parents
        
tree = {"name":"Formulas","children": [{"name":"FloatingHypotheses", "children":findFloatingHypothesesAndAxiomaticAssertionsEdges(parsedFloatingHypotheses, parsedConstants, parsedVariables, "floatingHypotheses")}, {"name":"AxiomaticAssertions", "children":findFloatingHypothesesAndAxiomaticAssertionsEdges(parsedAxiomaticAssertions, parsedConstants, parsedVariables,"axiomaticAssertions", floatingHypothesesNames)}]}

f = open("test.json", "w")
f.write(json.dumps(tree))
f.close()