/****************************************************************
* 3D C. Elegans Development
* Melissa Chiasson, Timothy Durham, Andrew Hill
* CSE 512, Spring 2015
* Javascript file to initialize and control visualizations of 
* C. Elegans Development.
****************************************************************/


/****************************************************************
GLOBAL VARIABLES
****************************************************************/
//global highlighting variables
var defaultColor='steelblue';
var selectionColor='#FFFF00';
var highlights = false;

//contains the data for each timepoint/cell
var csvdata = [];

//mapping of cell name to cell metadata
var cellmap = {P0: {name:'P0', parent:-1, children: [], selected: false,
                    userselected:false, color: defaultColor}};

//contains objects for progenitor cells preceding time series data
var P0 = {meta: cellmap.P0, pred: -1, succ: []};

//maps cell name to an index into csvdata for each time point
var namemap = [];

//maps cell types to cell names
var celltypes = {};
var cellnames = ['P0', 'AB', 'P1', 'EMS', 'P2', 'P3', 'P4'];
var celldesc = [];
var celltype = [];
var tissuetype = [];

//detect when all time points are loaded
var ready = false;

//blastomere predecessors are not as systematic as their daughters
var blastpred = {P0:'', AB:'P0', P1:'P0', EMS:'P1', P2:'P1',
                 MS:'EMS', E:'EMS', P3:'P2', C:'P2', P4:'P3', 
                 D:'P3', Z2:'P4', Z3:'P4'};

//timepoint counter for automated iteration through time points
var timepoint = 0;

//interval id for playback of development
var playback_id;

//3d variables
var x3d, scene;

//lineage picker idx, for unique ids
var lpidx = 1;

//tree x, y, and radius scales
var treeXScale, treeYScale, treeRadiusScale;

//other variables from scatterplot3D
var axisRange = [-1000, 1000];
var scales = [];
var initialDuration = 0;
var ease = 'linear';
var axisKeys = ["x", "y", "z"];

var load_idx = 0;

// Scale for small multiples plots
var small_multiples_scale = null;

//variables for speed dropdown
var speedarray = ["slow", "medium", "fast"];
var options = [0,1,2];
var speed = "slow"

// Hiding controls 
controls_hidden = false;

/****************************************************************
Lineage Highlighting Functions
****************************************************************/
/**
* TODO description here
*/
function makeLPDivTemplate(){
    var lpsubdiv = d3.select('div.lineage-pickers').append('div')
        .attr('class', 'lineage-picker-template')
        .attr('id', 'lineage-picker-template')
        .attr('style', 'display: none;');

    //Construct a select box for picking cell lineages/cell types to highlight
    var id = 'selhi'+lpidx;
    var select = lpsubdiv.append('select')
        .attr('class', 'selhi')
        .attr('id', id)
        .attr('data-placeholder', 'Cell Lineage or Cell Type...')
        .attr('onchange', 'updateCellColors(); updateCellSize(); updatePlot()');

    select.append('option').attr('value', '');
    var optgroup = select.append('optgroup')
        .attr('label', 'Tissue Type');

    var disp;
    for(var i=0; i < tissuetype.length; i++){
        if(tissuetype[i].length > 50){
            disp = tissuetype[i].substr(0, 50) + '...';
        }else{
            disp = tissuetype[i];
        }
        optgroup.append('option').attr('value', 'tt' + tissuetype[i]).html(disp);
    }

    optgroup = select.append('optgroup')
        .attr('label', 'Cell Type');
    for(i=0; i < celltype.length; i++){
        if(celltype[i].length > 50){
            disp = celltype[i].substr(0, 50) + '...';
        }else{
            disp = celltype[i];
        }
        optgroup.append('option').attr('value', 'ct' + celltype[i]).html(disp);
    }

    optgroup = select.append('optgroup')
        .attr('label', 'Cell Description');
    for(i=0; i < celldesc.length; i++){
        if(celldesc[i].length > 50){
            disp = celldesc[i].substr(0, 50) + '...';
        }else{
            disp = celldesc[i];
        }
        optgroup.append('option').attr('value', 'cd' + celldesc[i]).html(disp);
    }

    optgroup = d3.select('#'+id).append('optgroup')
        .attr('label', 'Cell Name');
    for(i=0; i < cellnames.length; i++){
        if(cellnames[i].length > 50){
            disp = cellnames[i].substr(0, 50) + '...';
        }else{
            disp = cellnames[i];
        }
        optgroup.append('option').attr('value', 'cn' + cellnames[i]).html(disp);
    }

    lpsubdiv.append('input')
        .attr('type', 'color')
        .attr('value', '#ff0000')
        .attr('class', 'hicolor')
        .attr('id', 'hicolor'+lpidx)
        .attr('onchange', 'updateCellColors(); updateCellSize(); updatePlot();');
    lpsubdiv.append('input')
        .attr('type', 'button')
        .attr('value', '-')
        .attr('class', 'removehi')
        .attr('id', 'removehi'+lpidx)
        .attr('onclick', 'removeLPDiv(event, this); updateCellColors(); updateCellSize(); updatePlot();');
    lpidx++;
}

/**
* TODO description here
* @param {TODO type} e - TODO description
* @param {TODO type} obj - TODO description
*/
function removeLPDiv(e, obj) {
    $(obj).parent().remove(); $("#add-lp").prop("disabled", false); updatePlot();

    // Restore color of + button
    $('#add-lp').removeAttr('style');
}

/**
* TODO description here
*/
function cloneLPDiv(){
    var highlightCount = $('.lineage-pickers').children().length
    if(highlightCount < 5){
        var lpdivclone = $('#lineage-picker-template').clone(true);
        lpdivclone.attr('id', 'lineage-picker'+lpidx)
            .attr('class', 'lineage-picker')
            .attr('style', 'display: block');
        var childs = lpdivclone.children();
        var id;
        for(var i = 0; i < childs.length; i++){
            id = childs[i].id;
            childs[i].id = id.substr(0, id.length - 1) + lpidx;
        }
        lpdivclone.appendTo('.lineage-pickers');
        $('#selhi'+lpidx).chosen({search_contains:true});
        lpidx++;
        if($('#lineage-pickers').children().length === 4){
            $('#add-lp').prop('disabled', true);
        }
    }

    // Grey out the button when too many highlights are added
    if (highlightCount >= 4) {
        $('#add-lp').css('background-color', '#D3D3D3').css('border-color', '#D3D3D3')
    }
}

/**
* TODO description here
* @param {string} showhide - TODO description
*/
function showHideHighlights(showhide){
    //here, show means hide and hide means show
    var datapoints = scene.selectAll('.datapoint')
    if(showhide.substr(0,4) === 'Show'){
        datapoints.filter(function(d){return d.meta.selected ? null : this;})
            .selectAll('shape appearance material')
            .attr('transparency', '1');
    }else{
        datapoints.selectAll('shape appearance material')
            .attr('transparency', '0');
    }
}

/**
* TODO description here
*/
function initializeLineagePicker(){
    d3.select('#highlighting')
        .append('div').attr('class', 'lineage-pickers');
    makeLPDivTemplate();
    cloneLPDiv();
    d3.select('#highlighting').append('input')
        .attr('type', 'button')
        .attr('value', '+')
        .attr('class', 'add-highlight')
        .attr('id', 'add-lp')
        .attr('onclick', 'cloneLPDiv()');
    d3.select('#highlighting').append('input')
        .attr('type', 'button')
        .attr('value', 'Hide Non-Highlighted')
        .attr('class', 'add-highlight')
        .attr('id', 'showhide-highlight')
        .attr('onclick', '(function(e, obj) {obj.value = obj.value.substr(0,4) === "Hide" ? "Show Non-Highlighted" : "Hide Non-Highlighted"; showHideHighlights(obj.value);})(event, this)');
}

/**
* TODO make description more clear: check to see if name is the name of a parent of object d
* @param {string} showhide - TODO description
*/
function isParentOf(d, name){
    //return true if name matches d
    if(d.name === name){
        return true;
    //this will work if name is blastomere or below
    }else if(d.name.indexOf(name) > -1){
        return true;
    //if this is the root node, then there are no more parents to check
    }else if(d.parent === -1){
        return false;
    //if name is not a substring of d, then the only way it can be a parent is 
    //for name to be a pre-blastomere. Find the blastomere node for this lineage
    //branch and recurse to either find parent or end at P0 (root).
    }else{
        var regex = /^(P0|AB|P1|EMS|P2|E|MS|C|P3|D|P4|Z2|Z3)/;
        var blast = regex.exec(d.name);
        if(blast === null){
            return false;
        }else{
            console.log(blast, name);
            return isParentOf(cellmap[blast[0]].parent, name);
        }
    }
}

/**
* TODO make description more clear: takes a cell name and concatenates any blastomere cell names to get a cell
* name string suitable for querying with .indexOf(<cellname>)
* @param {string} timepoint - TODO description
* @returns {string} - TODO description
*/
function timePointCellNames(timepoint){
    var timepoint_str = $.map(timepoint, function(elt, idx){return elt.meta.name;}).join('.');
    return cellNamesStr('.'+timepoint_str);
}

/**
* TODO add description
* @param {string} cellstr - TODO description
* @returns {string} - TODO description
*/
function cellNamesStr(cellstr){
    var regex = /\.(P0|AB|P1|EMS|P2|E|MS|C|P3|D|P4|Z2|Z3)/g;
    var blast_list = cellstr.match(regex);
    blast_list = blast_list.filter(onlyUnique);
    var blast_str = '';
    for (var i=1; i < blast_list.length; i++){
        blast_str += _cellnamesStrHelper(cellmap[blast_list[i].substr(1)]);
    }
    return blast_str + cellstr + '.';
}

/**
* TODO add description
* Based on http://stackoverflow.com/questions/1960473/unique-values-in-an-array
* @param {TODO type} value - TODO description
* @param {TODO type} index - TODO description
* @param {TODO type} self - TODO description
* @returns {boolean} - TODO description
*/
function onlyUnique(value, index, self){
    return self.indexOf(value) === index;
}

/**
* TODO add description
* @param {TODO type} obj - TODO description
* @returns {TODO type} - TODO description
*/
function _cellnamesStrHelper(obj){
    if (obj.parent === -1){
        return '.' + obj.name;
    }else{
        return _cellnamesStrHelper(obj.parent) + '.' + obj.name;
    }
}

/**
* TODO make description more clear: Produces an object mapping blastomere names to concatenated lineage suffixes.
* @param {TODO type} cellname - TODO description
* @returns {TODO type} - TODO description
*/
function cellLineageStr(cellname){
    var lineage_obj = {};
    _cellLineageStrHelper(lineage_obj, cellname, '');
    return lineage_obj;
}

/**
* TODO make description more clear: Helper function for cellLineageStr
* @param {TODO type} cellname - TODO description
* @returns {TODO type} - TODO description
*/
function _cellLineageStrHelper(lineage_obj, cellname, prev_name){
    var cell = cellmap[cellname];
    var regex = /^(AB|E|MS|C|D)([aplrdv]+)/;
    if(cell.children){
        for(var i=0; i < cell.children.length; i++){
            var child = cell.children[i];
            _cellLineageStrHelper(lineage_obj, child.name, cellname);
        }
    }
    //the non-blastomere name will be the second group matched
    var matchres = regex.exec(cell.name);
    //this must be a pre-blastomere (or random Nuc*** cell), so just add it as itself
    if(matchres === null){
        if(cell.name in lineage_obj){
            lineage_obj[cell.name].push(cell.name);
        }else{
            lineage_obj[cell.name] = [cell.name];
        }
    }else{
        var blast = matchres[1], lineagestr = matchres[2];
        //if this is a blastomere (AB, E, MS, C, or D) just set it as itself
        if(blast === cell.name){
            lineage_obj[blast] = [blast];
        //otherwise, add the lineage suffix to the corresponding blastomere string
        }else if(blast in lineage_obj){
            lineage_obj[blast].push(lineagestr);
        }else{
            lineage_obj[blast] = [lineagestr];
        }
    }
}

/**
* TODO add description (should include requirements of this function (for example, where it draws data from such as controls, etc.) and what effects it has)
*/
function updateCellColors(){
    setCellColors();
    d3.selectAll('.dp_sphere appearance material')
        .attr('diffuseColor', function(d){return d.meta.color;});
    d3.selectAll('.node-circle')
        .attr('fill', function(d){return d.color;});
}

/**
* TODO add description (should include requirements of this function (for example, where it draws data from such as controls, etc.) and what effects it has)
*/
function setCellColors(){
    //Collect highlight classes
    var picker_sel = document.getElementsByClassName('selhi');
    var picker_col = document.getElementsByClassName('hicolor');
    var selections = [];
    var colors = [];
    highlights = false;
    for(var i=0; i < picker_sel.length; i++){
        var selected = picker_sel[i].value;
        if(selected){
            highlights = true;
            var sel_type = selected.substr(0, 2);
            var sel_val = selected.substr(2);
            if(sel_type === 'cn'){
                selections.push(cellLineageStr(sel_val));
            }else {
                selections.push(celltypes[sel_val]);
            }
            colors.push(picker_col[i].value);
        }
    }
    //Calculate whether a data point should be highlighted and if so what color(s)
    //it should get
    var blastregex = /^(P0|AB|P1|EMS|P2|E|MS|C|P3|D|P4|Z2|Z3)/;
    var linregex = /([aplrdv]+)$/;
    var pt_colors;
    for(var cell_nm in cellmap){
        if(!cellmap.hasOwnProperty(cell_nm)){
            continue;
        }
        var cell = cellmap[cell_nm];
        pt_colors = []
        for(i=0; i < selections.length; i++){
            if(typeof selections[i] === 'string' && selections[i].indexOf(cell.name) > -1){
                pt_colors.push($.Color(colors[i]));
            }else if(typeof selections[i] === 'object'){
                //find blastomere name
                var blastmatch = blastregex.exec(cell.name);
                if(blastmatch === null){
                    console.log('null blastmatch: ' + cell.name);
                    continue;
                }
                var blast = blastmatch[1];

                //find lineage suffix
                var linmatch = linregex.exec(cell.name);
                if(linmatch === null){
                    if(blast === cell.name && cell.name in selections[i] 
                       && selections[i][cell.name].indexOf(cell.name) > -1){
                        pt_colors.push($.Color(colors[i]));
                    }
                    continue;
                }
                var linsuffix = linmatch[1];

                //if a color should be assigned to this blast/lineage combo, get it
                if(blast in selections[i] && selections[i][blast].indexOf(linsuffix) > -1){
                    pt_colors.push($.Color(colors[i]));
                }
            }
        }
        if(pt_colors.length === 0){
            cell.color = defaultColor;
            cell.selected = false;
        }else if(pt_colors.length === 1){
            cell.color = pt_colors[0].toHexString();
            cell.selected = true;
        }else{
            cell.color = Color_mixer.mix(pt_colors).toHexString();
            cell.selected = true;
        }
    }
}

/**
* TODO add description (should include requirements of this function (for example, where it draws data from such as controls, etc.) and what effects it has)
*/
function updateCellSize(){
    //find cells that are selected and are small, or cells that aren't selected 
    //and are big, erase them, and redraw
    var to_update = d3.selectAll('.datapoint')
        .filter(function(d){
            var scale = +$(this).attr('scale').split(',')[0];
            if((d.meta.selected && scale == 5) || //small and should be big
               (!d.meta.selected && scale > 5) || //big and should be small
               (!highlights && scale == 5)){      //reset any small to big
                   return this;
            }else{
                return null;
            }
        });
    to_update.remove();
    plot3DView(to_update);
}

/**
* TODO maybe add some to description: update the plots if the highlight options are changed when the development animation is not playing.
*/
function updatePlot(){
    var ppbutton = document.getElementById('playpause');
    var playpause = false;
    if(ppbutton.innerHTML === 'Pause'){
        playpause = true;
        playpausedev();
    }

    plotData(timepoint, 0);
    if(playpause){
        playpausedev();
    }
}

/**
* TODO add description (should include requirements of this function (for example, where it draws data from such as controls, etc.) and what effects it has)
*/
function loadCellTypeMap(){
    d3.text('waterston_celltypes_filtered.csv', function (csvtext){
        //read all the cell types in
        var rows = d3.csv.parseRows(csvtext);

        for(var i=0; i < rows.length; i++){
            var row = rows[i];
            var cellname = row[0];
            cellnames.push(cellname);
            var n;
            if(cellname.substr(0,3) == 'EMS'){
                n = 3;
            }else if(cellname.substr(0,1) === 'E' || cellname.substr(0,1) === 'C' || cellname.substr(0,1) === 'D'){
                n = 1;
            }else{
                n = 2;
            }
            for(n; n <= cellname.length; n++){
                var prev = cellname.substr(0, n);
                if(cellnames.indexOf(prev) === -1){
                    cellnames.push(prev);
                }
            }
            if(cellname.substr(0,2) == 'MS'){
                cellname = 'E' + cellname;
            }else if(cellname.substr(0,1) == 'E'){
                cellname = 'EMS' + cellname;
            }else if(cellname.substr(0,1) == 'C'){
                cellname = 'P2' + cellname;
            }else if(cellname.substr(0,1) == 'D'){
                cellname = 'P2P3' + cellname;
            }else if(cellname.substr(0,2) == 'P3'){
                cellname = 'P2' + cellname;
            }else if(cellname.substr(0,2) == 'P4'){
                cellname = 'P2P3' + cellname;
            }else if(cellname.substr(0,1) == 'Z'){
                cellname = 'P2P3P4' + cellname;
            }
            for(var ct_idx=4; ct_idx < 7; ct_idx++){
                var ct = row[ct_idx];
                if(!(ct in celltypes)){
                    celltypes[ct] = '';
                }
                celltypes[ct] += cellname;
                if(ct_idx == 4 && celldesc.indexOf(ct) === -1){
                    celldesc.push(ct);
                }else if(ct_idx == 5 && celltype.indexOf(ct) === -1){
                    celltype.push(ct);
                }else if(ct_idx == 6 && tissuetype.indexOf(ct) === -1){
                    tissuetype.push(ct);
                }
            }
        }
        //set up filter-able drop-down box
        cellnames.sort();
        celldesc.sort();
        celltype.sort();
        initializeLineagePicker();
            // TODO this is here temporarily -- will be moved once updating of the tree is
            // implemented
//            var root = getTreeRootFromTimepoints(csvdata, csvdata.length - 1);
//            initializeLineageTree(root);
        initializePlot();
        initializeSmallMultiples();
        initializeLineageTree(cellmap.P0);
        plotData(0, 5);
    });
}

/****************************************************************
 USER NODE SELECTION
****************************************************************/

/**
* TODO add description (should include requirements of this function (for example, where it draws data from such as controls, etc.) and what effects it has)
* @param {TODO type} cellname - TODO description
*/
function clickSelect(cellname){
    cellmap[cellname].userselected = !cellmap[cellname].userselected;
    var selection = [cellname];
    userSelectPoints(selection);
}

/**
* TODO maybe add some to description: This function adds outlines to highlight user-selected cells
* @param {TODO type} selection - TODO description
*/
function userSelectPoints(selection){
    //3Dplot
    d3.selectAll('.datapoint')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 ? this : null;})
        .selectAll('billboard').remove();
    var sdata = d3.selectAll('.datapoint')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 && d.meta.userselected ? this : null;});
    var user_highlight = sdata.append('billboard').attr('axisOfRotation', '0 0 0').append('shape');
    var appearance = user_highlight.append('appearance');
    appearance.append('material')
        .attr("emissiveColor", selectionColor)
        .attr("diffuseColor", selectionColor);
    user_highlight.append('Disk2D')
        .attr('innerRadius', '1')
        .attr('outerRadius', '1.4')
        .attr('solid', 'true')
        .attr('ccw', 'true')
        .attr('useGeoCache', 'true')
        .attr('lit', 'true')
        .attr('subdivision', '32');

    //lineage tree
    d3.selectAll('.node')
        .filter(function(d){return selection.indexOf(d.name) > -1 ? this : null;})
        .selectAll('.node-select').remove();
    var snode = d3.selectAll('.node')
        .filter(function(d){return selection.indexOf(d.name) > -1 && d.userselected ? this : null;})
        .append('circle')
        .attr('class', 'node-select')
        .attr("r", 8)
        .attr("fill", "none")
        .attr('stroke', selectionColor)
        .attr('stroke-width', '2')
        .attr("transform", function(d) { 
            return "translate(" + 0 + "," + d.y + ")"; }) // 0 is required for x to make edges match up with nodes
        .call(position_node)
        .call(scale_radius, 6, 0.5);
}

/****************************************************************
GRAPHICAL HELPER FUNCTIONS FOR 3D DEVELOPMENT PLOT
****************************************************************/

/**
* TODO maybe add some to description: Used to make 2d elements visible
* @param {TODO type} selection - TODO description
* @param {TODO type} color - TODO description
*/
function makeSolid(selection, color) {
    selection.append("appearance")
        .append("material")
        .attr("diffuseColor", color||"black")
    return selection;
}

/**
* TODO maybe add some to description: Initialize the axes lines and labels.
*/
function initializePlot() {
    initializeAxis(0);
    initializeAxis(1);
    initializeAxis(2);
}

/**
* TODO add description
* @param {TODO type} selection - TODO description
*/
function constVecWithAxisValue( otherValue, axisValue, axisIndex ) {
    var result = [otherValue, otherValue, otherValue];
    result[axisIndex] = axisValue;
    return result;
}

/**
* TODO add description
* @param {TODO type} axisIndex - TODO description
*/
function initializeAxis( axisIndex ){
    var key = axisKeys[axisIndex];
    drawAxis( axisIndex, key, initialDuration );

    var scaleMin = axisRange[0];
    var scaleMax = axisRange[1];

    // the axis line
    var newAxisLine = scene.append("transform")
        .attr("class", axisKeys[axisIndex])
        .attr("rotation", ([[0,0,0,0],[0,0,1,Math.PI/2],[0,1,0,-Math.PI/2]][axisIndex]))
        .append("shape")
    newAxisLine
        .append("appearance")
        .append("material")
        .attr("emissiveColor", "lightgray")
    newAxisLine
        .append("polyline2d")
         // Line drawn along y axis does not render in Firefox, so draw one
         // along the x axis instead and rotate it (above).
        .attr("lineSegments", scaleMin * 0.4 + " 0," + scaleMax * 0.4 + " 0")
    
    // axis labels
    var labels = {'0':['Anterior', 'Posterior'],
                  '1':['Ventral', 'Dorsal'],
                  '2':['Right', 'Left']
                  };
    var labelFontSize = 60;

    var newAxisLabel = scene.append("transform")
        .attr("class", 'axis-label')
        .attr("translation", constVecWithAxisValue( 0, scaleMin*0.42, axisIndex));

    var newAxisLabelShape = newAxisLabel
        .append("billboard")
            .attr("axisOfRotation", "0 0 0") // face viewer
        .append("shape")
            .call(makeSolid)

    newAxisLabelShape
        .append("text")
            .attr("class", 'axis-label-text')
            .attr("solid", "true")
            .attr("string", labels[axisIndex][0])
        .append("fontstyle")
            .attr("size", labelFontSize)
            .attr("family", "SANS")
            .attr("justify", "END MIDDLE" )

    newAxisLabel = scene.append("transform")
        .attr("class", 'axis-label')
        .attr("translation", constVecWithAxisValue( 0, scaleMax*0.42, axisIndex));

    newAxisLabelShape = newAxisLabel
        .append("billboard")
            .attr("axisOfRotation", "0 0 0") // face viewer
        .append("shape")
            .call(makeSolid)

    newAxisLabelShape
        .append("text")
            .attr("class", 'axis-label-text')
            .attr("solid", "true")
            .attr("string", labels[axisIndex][1])
        .append("fontstyle")
            .attr("size", labelFontSize)
            .attr("family", "SANS")
            .attr("justify", "END MIDDLE" )
}

/**
* TODO maybe add some to description: Assign key to axis, creating or updating its ticks, grid lines, and labels.
* @param {TODO type} selection - TODO description
*/
function drawAxis( axisIndex, key, duration ) {
    var scale = d3.scale.linear()
        .domain( [-1000,1000] ) // demo data range
        .range( axisRange )
    
    scales[axisIndex] = scale;
}

/**
* Plots data in the 3D view. Determines show/hide status of points and adds popover text to each cell.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
* @returns {TODO type} - TODO description
*/
function plot3DView(to_plot){
    var x = scales[0], y = scales[1], z = scales[2];
    // Draw a sphere at each x,y,z coordinate.
    var new_data = to_plot.append('transform')
        .attr('translation', function(d){
            if (d.pred == -1){
                return x(d.x) + " " + y(d.y) + " " + z(d.z);
            }else{
                return x(d.pred.x) + " " + y(d.pred.y) + " " + z(d.pred.z);
        }})
        .attr('class', 'datapoint')
        .attr('id', function(d){return d.meta.name})
        .attr('scale', function(d){
                if(d.meta.selected || !highlights){
                    var ptrad = d.radius * 0.5; 
                    return [ptrad, ptrad, ptrad];
                }else{
                    return [5, 5, 5];
                }
        })
        .attr('onclick', '(function(e, obj) {clickSelect(obj.__data__.meta.name);})(event, this)');

    var showhide = document.getElementById('showhide-highlight').value;
    var transp = 0;
    if(showhide.substr(0,4) === 'Show'){
        transp = 1;
    }
    //finish generating data points
    new_data = new_data.append('shape')
        .attr('class', 'dp_sphere');
    new_data.append('appearance').append('material')
        .attr('transparency', function(d){
            if(d.meta.selected || !highlights){
                return 0;
            }else{
                return transp;
            }
        })
        .attr('diffuseColor', function(d){
            return d.meta.color;
        });
    new_data.append('sphere')
        // Add attributed for popover text
        .attr('data-toggle', 'popover')
        .attr('title', function(d) {return d.meta.name})
        .attr('data-content', function(d) {return '<b>x:</b> ' + Math.round(d.x * 10000) / 10000 + '<br />' + '<b>y:</b> ' + Math.round(d.y * 10000) / 10000 + '<br />' + '<b>z:</b> ' + Math.round(d.z * 10000) / 10000 + '<br />'})
        .attr('data-trigger', 'hover')
        .attr('data-placement', 'bottom')
        .attr('data-html', 'true');

    // Add the popover behavior for cells
    $(document).ready(function(){
        $('[data-toggle="popover"]').popover();   
    });
    
    //make sure that these new/updated points have the correct user highlighting
    var new_data_names = [];
    new_data.select(function(d){new_data_names.push(d.meta.name); return null;});
    userSelectPoints(new_data_names);

    return new_data;
}

/**
* Initializes axes for the 3 small multiples plots as XY, XZ, and YZ plots. These are appended to the #divPlot div.
*/
function initializeSmallMultiples() {
    var width = 100
      , height = 100;

    small_multiples_scale = d3.scale.linear()
              .domain([-300, 300])
              .range([0, width]);

 
    // Make the axes for the x-y chart
    var xyChart = d3.select('#divPlot')
    .append('svg:svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'small_multiples_chart')
    .attr('id', 'xyChart')

    var main = xyChart.append('g')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'main')   

    var g = main.append("svg:g")
        .attr('id', 'xy_data_points');


    // Make the axes for the x-z chart
    var xzChart = d3.select('#divPlot')
    .append('svg:svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'small_multiples_chart')
    .attr('id', 'xzChart')

    var main = xzChart.append('g')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'main')   

    var g = main.append("svg:g")
        .attr('id', 'xz_data_points');

    // Make the axes for the x-z chart
    var yzChart = d3.select('#divPlot')
    .append('svg:svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'small_multiples_chart')
    .attr('id', 'yzChart')

    var main = yzChart.append('g')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'main')   

    var g = main.append("svg:g")
        .attr('id', 'yz_data_points');

}

/**
* Plots points on the XY small multiple axis. initializeSmallMultiples must be called first.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
*/
function plotXYSmallMultiple(to_plot) { 
    to_plot.append("svg:circle")
        .attr('class', 'small_multiples_datapoint')
        .attr('id', function(d){return d.meta.name})
        .attr('onclick', '(function(e, obj) {clickSelect(obj.__data__.meta.name);})(event, this)')
        .attr("cx", function (d) { return small_multiples_scale(d.x); } )
        .attr("cy", function (d) { return small_multiples_scale(-d.y); } )
        .attr("r", function(d) {
            if(d.meta.selected || !highlights){
                return d.radius/15;
            }else{
                return  d.radius/25;
            }
        })
        .attr("fill", function (d) { return d.meta.color; } )
        .attr('opacity', 0.8);
}

/**
* Plots points on the XZ small multiple axis. initializeSmallMultiples must be called first.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
*/
function plotXZSmallMultiple(to_plot) { 
    to_plot.append("svg:circle")
        .attr('class', 'small_multiples_datapoint')
        .attr('id', function(d){return d.meta.name})
        .attr('onclick', '(function(e, obj) {clickSelect(obj.__data__.meta.name);})(event, this)')
        .attr("cx", function (d) { return small_multiples_scale(d.z); } )
        .attr("cy", function (d) { return small_multiples_scale(d.x); } )
        .attr("r", function(d) {
            if(d.meta.selected || !highlights){
                return d.radius/15;
            }else{
                return  d.radius/25;
            }
        })
        .attr("fill", function (d) { return d.meta.color; } )
        .attr('opacity', 0.8);
}

/**
* Plots points on the YZ small multiple axis. initializeSmallMultiples must be called first.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
*/
function plotYZSmallMultiple(to_plot) { 
    to_plot.append("svg:circle")
        .attr('class', 'small_multiples_datapoint')
        .attr('id', function(d){return d.meta.name})
        .attr('onclick', '(function(e, obj) {clickSelect(obj.__data__.meta.name);})(event, this)')
        .attr("cx", function (d) { return small_multiples_scale(d.z); } )
        .attr("cy", function (d) { return small_multiples_scale(-d.y); } )
        .attr("r", function(d) {
            if(d.meta.selected || !highlights){
                return d.radius/15;
            }else{
                return  d.radius/25;
            }
        })
        .attr("fill", function (d) {return d.meta.color; } )
        .attr('opacity', 0.8);
}

/**
* Updates visible nodes on the lineage tree to show only specified cells by name.
* @param {TODO type} cellnames - TODO description
* @param {TODO type} new_data_names - TODO description
*/
function plotLineageTree(cellnames, new_data_names){
    var allnodes = d3.selectAll('.node');
    allnodes.selectAll('.node-circle').attr('style', 'visibility:hidden;');
    var visiblenodes = allnodes.filter(function(d){
        if(d.name === 'E' || d.name === 'MS'){
            if(cellnames.indexOf('.'+d.name+'.') > -1){
                return this;
            }else{
                return null;
            }
        }else{
            if(cellnames.indexOf(d.name) > -1){
                return this;
            }else{
                return null;
            }
        }
    });
    visiblenodes.selectAll('.node-circle')
        .attr('style', 'visibility:visible')
        .attr('fill', function(d){return d.color;});

    var newnodes = visiblenodes.filter(function(d){
        if(new_data_names.indexOf(d.name) > -1){
            return this;
        }else{
            return null;
        }
    });
    var circ1 = newnodes.selectAll('circle')
        .attr('x', function(d){
            return treeXScale(this.parentNode.__data__.parent.x);
        })
        .attr('cx', function(d){
            return treeXScale(this.parentNode.__data__.parent.x);
        })
        .attr('y', function(d){
            return this.parentNode.__data__.parent.y;
        })
        .attr('transform', function(d){ return 'translate('+0+','+this.parentNode.__data__.parent.y + ')';});
    return newnodes;
}

/**
* Wrapper function that transitions all plots to a specified timepoint. Determines new data to plot and then passes along to individual plotting functions to update.
* @param {integer} time_point - Index of the timepoint to transition to
* @param {integer} duration - Duration of the smooth animation to transition datapoints in milliseconds
*/
function plotData( time_point, duration ) {
    if (!this.csvdata){
     console.log("no rows to plot.");
     return;
    }

    //Get the data for this timepoint
    var timepoint_data = csvdata[time_point % csvdata.length];
    var datapoints = scene.selectAll(".datapoint").data( timepoint_data, function(d){return d.meta.name;});
    datapoints.exit().remove();
    var cellnames = timePointCellNames(timepoint_data);

    // Get small multiples data
    var small_multiples_datapoints_xy = d3.select('#xy_data_points').selectAll(".small_multiples_datapoint").data( timepoint_data, function(d){return d.meta.name + '_xy';});
    small_multiples_datapoints_xy.exit().remove();
    plotXYSmallMultiple(small_multiples_datapoints_xy.enter());

    var small_multiples_datapoints_xz = d3.select('#xz_data_points').selectAll(".small_multiples_datapoint").data( timepoint_data, function(d){return d.meta.name + '_xz';});
    small_multiples_datapoints_xz.exit().remove();
    plotXZSmallMultiple(small_multiples_datapoints_xz.enter());

    var small_multiples_datapoints_yz = d3.select('#yz_data_points').selectAll(".small_multiples_datapoint").data( timepoint_data, function(d){return d.meta.name + '_yz';});
    small_multiples_datapoints_yz.exit().remove();
    plotYZSmallMultiple(small_multiples_datapoints_yz.enter());

    //Draw points with coloring and code to highlight a specific lineage
    var transp = 0;
    var pt_color_map = {};

    //plot data in 3D view
    var new_data = plot3DView(datapoints.enter())

    //use new_data to identify which nodes in the tree should be revealed
    var new_data_names = [];
    new_data.each(function(d){
        new_data_names.push(d.meta.name);
    });
    
    //plot the lineage tree
    var newnodes = plotLineageTree(cellnames, new_data_names);

    //transition points
    var x = scales[0], y = scales[1], z = scales[2];
    datapoints.transition().ease(ease).duration(duration)
        .attr("translation", function(row) {
            return x(row.x) + " " + y(row.y) + " " + z(row.z);
        });

    // Transition small multiples points
    small_multiples_datapoints_xy.transition().ease(ease).duration(duration)
        .attr("cx", function(row) {return small_multiples_scale(row.x);})
        .attr("cy", function(row) {return small_multiples_scale(-row.y);})

    small_multiples_datapoints_xz.transition().ease(ease).duration(duration)
        .attr("cx", function(row) {return small_multiples_scale(row.z);})
        .attr("cy", function(row) {return small_multiples_scale(row.x);})

    small_multiples_datapoints_yz.transition().ease(ease).duration(duration)
        .attr("cx", function(row) {return small_multiples_scale(row.z);})
        .attr("cy", function(row) {return small_multiples_scale(-row.y);})

    //transition tree nodes
    var circ2 = newnodes.selectAll('circle').transition().ease(ease).duration(duration)
        .attr('x', function(d){return d3.select(this).attr('x0');})
        .attr('cx', function(d){return d3.select(this).attr('cx0');})
        .attr('y', function(d){return d3.select(this).attr('y0');})
        .attr('transform', function(d){ return 'translate('+0+','+d3.select(this).attr('y0')+')';});
}

/****************************************************************
HELPER FUNCTIONS FOR DATA PARSING AND INITIALIZATION
****************************************************************/

/**
* TODO add description
* @param {TODO type} csvdata_in - TODO description
*/
function parseCSV(csvdata_in) {
    var rows = d3.csv.parseRows(csvdata_in);
    var tp = 1;
    var tpdata = []
    for (var i=1; i < rows.length; i++){
        row = rows[i];
        if(+row[1] != tp){
            csvdata[tp - 1] = tpdata;
            tp = +row[1];
            tpdata = [];
        }
        tpdata.push({'x': +row[2],
                     'y': +row[3],
                     'z': +row[4] * 11.1,
                     'radius': +row[5],
                     'pred': -1,
                     'succ': [],
                     'meta':{'name': row[0].trim().replace(/\s/g, '_'),
                             'parent': -1,
                             'children': [],
                             'selected':false,
                             'userselected':false,
                             'color':defaultColor}
        });
    }
    csvdata[tp - 1] = tpdata;
    return;
}

/**
* TODO add description. 
*/
function loadTimePoints(){

    var url = 'http://localhost:2255/ImageExpressionTable.timesort.fixed.normalized.bincollapsed.csv';
    d3.text(url, function(tpdata){
        parseCSV(tpdata);
        for(var idx = 0; idx < csvdata.length; idx++){
            namemap[idx] = {};
            for(var i = 0; i < csvdata[idx].length; i++){
                //make entry in namemap for this cell at this timepoint
                var cell = csvdata[idx][i];
                namemap[idx][cell.meta.name] = i;
                //get predecessor in previous time point
                var pred_idx;
                if(idx > 0){
                    pred_idx = namemap[idx-1][cell.meta.name];
                }
                if(typeof pred_idx === 'undefined'){
                    var pred_name;
                    //blastomere names are not systematic, so we have to look them up
                    if(cell.meta.name in blastpred){
                        pred_name = blastpred[cell.meta.name];
                    }else{
                        pred_name = cell.meta.name.substr(0, cell.meta.name.length - 1);
                    }
                    if(idx > 0){
                        pred_idx = namemap[idx-1][pred_name];
                    }
                }
                if(typeof pred_idx === 'undefined'){
                    cell.pred = -1;
                    if(pred_name){
                        cell.meta.parent = cellmap[pred_name];
                        cell.meta.parent.children.push(cell.meta);
                    }
                    cellmap[cell.meta.name] = cell.meta;
                }else{
                    //link cell to time point data structure
                    cell.pred = csvdata[idx-1][pred_idx];
                    cell.pred.succ.push(cell);

                    //add entries to lineage data structure (if it's not there already)
                    if(!(cell.meta.name in cellmap)){
                        cell.meta.parent = cellmap[cell.pred.meta.name];
                        cell.meta.parent.children.push(cell.meta);
                        cellmap[cell.meta.name] = cell.meta;
                    }else{
                        cell.meta = cellmap[cell.meta.name];
                    }
                }
            }
        }
        ready = true;
        d3.select('#timerange').attr('max', csvdata.length - 1);

        //load cell type data
        loadCellTypeMap();
        return;
    });
}

/****************************************************************
INITIALIZATION AND CALLBACKS FOR VISUALIZATION
****************************************************************/

/**
* Handles play and pause of development by starting and stopping playback, changing playback speed, and changing play button text.
* @callback - callback function play/pause button
*/
function playpausedev(){
    var button = document.getElementById('playpause');

    if(button.innerHTML === "Play"){
    	if(speed === "slow"){
        	playback_id = setInterval(development, 1000);
        	button.innerHTML = "Pause";
        	}
        else if(speed === "medium"){
        	playback_id = setInterval(development, 500);
        	button.innerHTML = "Pause";
        	}
        else if(speed === "fast"){
        	playback_id = setInterval(development, 250);
        	button.innerHTML = "Pause";
        	}
    }else{
        clearInterval(playback_id);
        button.innerHTML = "Play";
    }
}

/**
* Resets the 3D view to the original orientation.
* @callback - callback function for Reset View button
*/
function resetView() {
  x3d.node().runtime.resetView()
}

function hideControls() {
    if(! controls_hidden) {
        controls_hidden = true;
        $('#divControls').animate({width: "0px"}, 500, function() {});
        $('#hide-controls').attr('value', '>')
        $('#divPlot').animate({margin: "0"}, 500, function() {});
    } else {
        controls_hidden = false;
        $('#divControls').animate({width: "415"}, 500, function() {});
        $('#hide-controls').attr('value', '<')
        $('#divPlot').animate({"margin-left": "415"}, 500, function() {});
    }
}

/**
* TODO description
* @callback - TODO is this a callback?
*/
function development() {
    if (ready && x3d.node() && x3d.node().runtime ) {
        timepoint++;
        plotData(timepoint,1000);
        document.getElementById('timerange').value = timepoint % csvdata.length;
    } else {
        console.log('x3d not ready.')
    }
}

/**
* Updates the timepoint variable to match the playback slider value and update plots accordingly
* @callback - is htis a callback?
*/
function updatetime() {
    timepoint = document.getElementById('timerange').value;
    plotData(timepoint, 500);
}

/****************************************************************
HELPER FUNCTIONS FOR LINEAGE TREE PLOTTING
****************************************************************/

/**
* Sets the various position properties of nodes in the lineage tree to make them appear in the right place.
* @callback - called to position nodes when distortion slider moves and on initial setup.
*/
var width = 2000;
function position_node(node) {
    node.attr("cx", function(d) {return treeXScale(d.x);})
        .attr("cx0", function(d) {return treeXScale(d.x);})
        .attr("x", function(d) {return treeXScale(d.x);})
        .attr("x0", function(d) {return treeXScale(d.x);})
        .attr("y", function(d) {return d.y;})
        .attr("y0", function(d) {return d.y;});
}

/**
* Sets the radius of nodes in the lineage tree to scale larger towards the center of the lineage tree plot.
* @callback - called to set radius when distortion slider moves and on initial setup.
*/
function scale_radius(circle, maxCircleRadius, minCircleRadius) {
    circle.attr("r", function(d) {
        var currentPosition = treeXScale(d.x)
        if (d.depth <= 2) { 
            return maxCircleRadius
        } else {
            return Math.max(maxCircleRadius * (-4/Math.pow(width, 2) * Math.pow(currentPosition, 2) + 4 / width * currentPosition), minCircleRadius)
        } 
    });
  }

/**
* Sets up the cell lineage tree and associated distortion slider. 
* @param {TODO type} root - root node of the lineage tree to be plotted
* @callback - called to set radius when distortion slider moves and on initial setup.
*/
function initializeLineageTree(root) {

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
  height = 700 - margin.top - margin.bottom;

  var tree_div = d3.select("#divPlot")
    .append('div')
    .attr("class", 'lineage_tree')

  /****************************************************************
  Set up distortion scale and associate slider
  ****************************************************************/
  var xScale = d3.fisheye.scale(d3.scale.linear)
    .domain([0, 340])
    .range([0, width])
    .distortion(45)
    .power(1)
    .focus(0)
  treeXScale = xScale;

  var distortion_slider = tree_div
    .append('input')
      .attr('type', 'range')
      .attr('id', 'distortion_slider')
      .attr('defaultValue', 0)
      .attr('min', 0)
      .attr('max', width)
      .attr('step', 1)
      .attr('value', 0)

  distortion_slider.on("input", function() {
    setting = this.value
    xScale.focus(setting);
    node.call(position_node);
    link.call(position_links);
    text.call(position_text);
    node.call(scale_radius, 8, 2.5);
    var selectednodes = d3.selectAll('.node-select')
        .call(position_node)
        .call(scale_radius, 6, 0.5);
  });

  /****************************************************************
  Initial sizing of the lineage tree
  ****************************************************************/
  // Set up the SVG element
  var svg = tree_div
    .append("svg")
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("preserveAspectRatio", "xMidYMid")
      .append("g")

  // Add callback to maintain aspect ratio on window resize
  var aspect = width / height,
    chart = $("lineage_tree").select('svg');

  $(window).on("resize", function() {
      var targetWidth = chart.parent().width();
      chart.attr("width", targetWidth);
      chart.attr("height", targetWidth / aspect);
  });

  /****************************************************************
  Generate Tree Layout
  ****************************************************************/   
  var tree = d3.layout.tree()
      .size([height/2, width])
      .sort(function(a, b) { return d3.ascending(a.name, b.name); });

  var diagonal = d3.svg.diagonal()
      .projection(function(d) { return [xScale(d.x), d.y]; });

  // Compute the tree layout.
  var nodes = tree.nodes(root),
      links = tree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 50 + 10;});

  /****************************************************************
  Add graphics to nodes and links in tree layout
  ****************************************************************/
  // Enter the nodes.
  var i = 0;
  var node = svg.append("g")
    .attr("class", "nodes")
    .selectAll(".node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); })
        .enter().append("g")
        .attr("class", "node")
//        .attr('onclick', 'clickSelect(this.__data__.name); updatePlot();')
        .attr('onclick', '(function(e, obj) {clickSelect(obj.__data__.name);})(event, this)')
        .append('circle')
          .attr('class', 'node-circle')
          .attr("r", 10)
          .attr("fill", "steelblue")
          .attr("transform", function(d) { 
            return "translate(" + 0 + "," + d.y + ")"; }) // 0 is required for x to make edges match up with nodes
          .call(position_node)
          .call(scale_radius, 8, 2.5)

  // Add text labels to each node
  var text = svg.selectAll(".node").append('text')
    .attr('class', 'text')
    .text(function(d) {return d.name})
    .call(position_text)

  // Add links between node
  var link = svg.selectAll("path.link")
    .data(links)
    .enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", diagonal)
      .call(position_links)

  /****************************************************************
  Functions for positioning and scaling elements accounting for distortion and position within window
  ****************************************************************/

  /**
  * Sets the position of text within the distorted lineage tree view.
  * @callback - called to set text position when distortion slider moves and on initial setup.
  */
  function position_text(text) {
    text 
      .attr("cx", function(d) {return xScale(d.x);})
      .attr("x", function(d) {return xScale(d.x);})
      .attr("y", function(d) {return d.y;})

      // Scale opacity with position
      .style("opacity", function(d) {
        var currentPosition = xScale(d.x)

        minOpacity = 0
        maxOpacity = 1

        if (d.depth <= 2) { 
          return maxOpacity
        } else {
          return Math.max(-4.5/Math.pow(width, 2) * Math.pow(currentPosition, 2) + 4.5/ width * currentPosition - 0.05, minOpacity)
        } 
      })

      .attr("transform", function(d) {return "translate(-5, 15)rotate(90" + "," + xScale(d.x) + "," + d.y + ")"})
  }

  /**
  * Sets the position of links (edges) within the distorted lineage tree view.
  * @callback - called to set link positions when distortion slider moves and on initial setup.
  */
  function position_links(link) {
    diagonal.projection(function(d) {return [xScale(d.x), d.y]; }) 
    link.attr("d", diagonal);
  }

  return;
}

/****************************************************************
Main Thread of execution
****************************************************************/
function scatterPlot3d( parent ) {
    x3d = parent  
        .append("x3d")
        .attr('id', '3dplot')
        .style( "border", "none" )

    scene = x3d.append("scene")

    var viewpoint = scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-300, -300, 800, 800])
        .attr( "orientation", [-0.5, 1, 0.2, 1.12*Math.PI/4])
        .attr( "position", [600, 150, 800])

    console.log("Reading in embryo positions.");
    loadTimePoints();
    console.log("Loading data");

    d3.select('#hide-controls')
      .attr('onclick', 'hideControls()');

    d3.select('#reset-button')
      .attr('onclick', 'resetView()');

    // Add play button for time points
    d3.select('#playpause')
        .attr('onclick', "playpausedev()")

    // Add slider for time points
    d3.select('#timerange')
        .attr('defaultValue', 0)
        .attr('min', 0)
        .attr('step', 1)
        .attr('value', 0)
        .attr('onchange', 'updatetime()');
           
    d3.select('body').select('select')
        .on("change", function(d) {speed = this.value;});
}
