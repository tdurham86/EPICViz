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
var defaultColor='#a8a8a8';
var selectionColor = '#FFD700';
//boolean value indicates whether this color is currently in use
var highlightColorDefaults = {'#e41a1c':false, '#377eb8':false, '#ff7f00':false, '#f781bf':false};
var highlights = false;

//contains the data for each timepoint/cell
var csvdata = [];

//contains data points for current gene expression pattern
var exprdata = {};

//mapping of cell name to cell metadata, this metadata is linked to from the 
//'meta' field of the objects in csvdata
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

// Wormbase gene map
var wormbase_map = {};

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
currentViewpoint = 0;

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

// Scale for PCA plot
var pca_scale_x = null;
var pca_scale_y = null;

//variables for speed dropdown
var speedarray = ["slow", "medium", "fast"];
var options = [0,1,2];
var speed = "slow"

// Hiding controls 
controls_hidden = false;

//Gene Expression Globals
var exprPlot_scale;
var gene_names;

/****************************************************************
Lineage Highlighting Functions
****************************************************************/
/**
* This function generates the HTML for a single lineage picker. This template
* is added to the page HTML, but hidden. When a new lineage picker is added by
* clicking the '+' button in the control panel, this template is copied and the
* copy made visible and assigned a unique id.
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
        .attr('data-placeholder', 'Cell lineage/type...')
        .attr('onchange', 'updateCellColors(); updateCellSize(); updateExprRectColors(); updatePlot()')
        .attr('multiple','multiple');
       

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
   
     //optgroup.append('option').attr('value', 'cn' + 'cellname').html('cellname');
    //Construct a select box for picking logic to allow users to customly pick highlghted dataset
    var id = 'loghi'+lpidx;
    var select = lpsubdiv.append('select')
        .attr('class', 'loghi')
        .attr('id', id)
        .attr('data-placeholder', 'Set Logic')
        .attr('onchange', 'updateCellColors(); updateCellSize(); updateExprRectColors(); updatePlot()');
    
    select.append('option').attr('value', '');
    outgroup = d3.select('#'+id).append('optgroup')
    outgroup.append('option').attr('value','op' + 'Union').attr('selected', 'selected').html('Union');
    outgroup.append('option').attr('value','op' + 'Intersection').html('Intersect');

    lpsubdiv.append('input')
        .attr('type', 'color')
//        .attr('value', '#ff0000')
//        .attr('defaultValue', '#ff0000')
        .attr('class', 'hicolor')
        .attr('id', 'hicolor'+lpidx)
        .attr('onchange', 'updateCellColors(); updateCellSize(); updateExprRectColors(); updatePlot();');
    lpsubdiv.append('input')
        .attr('type', 'button')
        .attr('value', '-')
        .attr('class', 'removehi')
        .attr('id', 'removehi'+lpidx)
        .attr('onclick', 'removeLPDiv(event, this); updateCellColors(); updateCellSize(); updateExprRectColors(); updatePlot();');
    lpidx++;
}

/**
* This function removes a lineage picker div section.
* @param {Javascript event} e - Javascript event (not used in the function)
* @param {HTML element} obj - element on which the event was called (a lineage
*                             picker div in this case)
* @callback - This function is a callback for the '-' button in a set of lineage
*             picker controls
*/
function removeLPDiv(e, obj) {
    var defcolor = $(obj).parent().children('.hicolor').attr('defaultValue');
    highlightColorDefaults[defcolor] = false;
    $(obj).parent().remove();
    $("#add-lp").prop("disabled", false);
    
    // Restore color of + button
    $('#add-lp').removeAttr('style');
}

/**
* This function copies the lineage picker template (makeLPDivTemplate() must be
* called first to set up this template), gives the copy a unique id, and sets
* the display CSS attribute to 'block' so that the copied controls are visible.
*/
function cloneLPDiv(){
    var highlightCount = $('.lineage-pickers').children().length
    if(highlightCount < 5){
        // Automatically set the new color picker's default color and record
        // that default as used by setting its value to true
        for(var highlight_color in highlightColorDefaults){
            if(!highlightColorDefaults[highlight_color]){
                highlightColorDefaults[highlight_color] = true;
                break;
            }
        }
        d3.select('#hicolor' + 1)
            .attr('value', highlight_color)
            .attr('defaultValue', highlight_color);

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
        
        lpdivclone.appendTo('.lineage-pickers');
        $('#loghi'+lpidx).chosen({search_contains:true});
        lpidx++;

        //only allow up to 4 sets of lineage picker controls
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
* This function will make non-highlighted cells invisible in the 3D plot.
* @param {string} showhide - value of the Show/Hide Non-Highlighted button
*
* @callback - This function is a callback fired when the Show/Hide 
*             Non-Highlighted button is clicked.
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
* This function is called as the visualization is loading to set up the lineage
* picker controls. It calls makeLPDivTemplate(), cloneLPDiv(), and then sets up
* the the buttons to add LP controls and to show or hide non-highlighted cells.
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
* Takes an array of cells for a particular time point (i.e. an element from 
* csvdata), concatenates the names of the cells present at this time point with
* '.' delimiters, and then calls cellNameStr() to add the blastomere name(s) for
* the cells that are present. Returns this string of '.'-delimited cell names.
* This produces a string such that any cell present at this time point or any 
* ancestor of such a cell can be identified by simply querying the cell name
* against this string with .indexOf(<cellname>)
* @param {string} timepoint - array from csvdata corresponding to a particular
*                             timepoint
* @returns {string} - a string of '.'-delimited cell names that contains all 
*                     leaf cells at this time point, and, by virtue of the 
*                     C. elegans cell naming convention, names of all ancestors
*                     of leaf cells at this time point.
*/
function timePointCellNames(timepoint){
    var timepoint_str = $.map(timepoint, function(elt, idx){return elt.meta.name;}).join('.');
    return cellNamesStr('.'+timepoint_str);
}

/**
* Takes a string of cell names (delimited with '.', as from timePointCellNames),
* finds the blastomere prefixes on these cell names, concatenates these 
* blastomere names with '.' delimiters, and adds this blastomere string to the 
* string of cell names. This is necessary because the blastomere naming does
* not follow branch cell naming conventions (e.g. EMS is the parent of the E and
* MS branches).
* @param {string} cellstr - '.'-delimited cell name string, as generated by
*                           timePointCellNames()
* @returns {string} - a '.'-delimited cell name string with blastomere names
*                     added
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
* Filtering function to return only unique entries in the list.
* Based on http://stackoverflow.com/questions/1960473/unique-values-in-an-array
* @param {list element} value - value to search the list for
* @param {int} index - current index for the list.filter() method
* @param {list} self - list being filtered by this function
* @returns {boolean} - whether the current element is the first time this value
*                      has been encountered in the list. The filtering function
*                      will throw away any subsequent identical values (they 
*                      will cause this function to return false instead of true)
*/
function onlyUnique(value, index, self){
    return self.indexOf(value) === index;
}

/**
* Recursively build a string of cell names by appending names of parent cells
* to a growing '.'-delimited string. This can work on any cell metadata object
* present in cellmap, but in practice is used to resolve blastomere parents, as
* blastomere naming conventions do not follow the convenient progressive names
* of their children.
* @param {cellmap object} obj - object from cellmap representing a cell in the 
*                               C. elegans lineage tree
* @returns {string} - '.'-delimited string of cell names of the provided cell 
*                     and all ancestors.
*/
function _cellnamesStrHelper(obj){
    if (obj.parent === -1){
        return '.' + obj.name;
    }else{
        return _cellnamesStrHelper(obj.parent) + '.' + obj.name;
    }
}

/**
* Produces an object mapping blastomere names to concatenated lineage suffixes.
* The role of this function is very similar to that of cellNameStr(), but it 
* tries to handle the blastomere/branch cell distinction more explicitly. This 
* avoids EMS bugs in which the E cell gets highlighted when the EMS cell is 
* present in a selection.
* @param {string} cellname - The name of a cell in the lineage tree.
* @returns {object} - a javascript object mapping blastomere names as keys to
*                     strings of concatenated branch cell suffixes as values.
*                     To check if any cell is an ancestor, match that cell's
*                     branch suffix (lower case letters in a branch cell's name)
*                     to the concatenated suffix string of the corresponding 
*                     blastomere (capital letters in the cell name) using 
*                     .indexOf()
*/
function cellLineageStr(cellname){
    var lineage_obj = {};
    _cellLineageStrHelper(lineage_obj, cellname, '');
    return lineage_obj;
}

/**
* Helper function for cellLineageStr() that recursively builds the cell name-
* based lineage_obj
* @param {object} lineage_obj - object mapping blastomere names (i.e. 
*                               capitalized part of cell names) to strings of 
*                               concatenated branch suffixes (i.e. lower case 
*                               part of cell names)
* @param {string} cellname - the name of a cell in the lineage tree
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
* Function to set cell colors in the 3D plot and lineage tree based on the
* 'color' entry in each cells metadata in the cellmap
* @callback - called whenever a lineage picker selection is changed
*/
function updateCellColors(){
    setCellColors();
    d3.selectAll('.dp_sphere appearance material')
        .attr('diffuseColor', function(d){return d.meta.color;});
    d3.selectAll('.node-circle')
        .attr('fill', function(d){return d.color;});
    d3.selectAll('.small_multiples_datapoint')
        .attr('fill', function(d){return d.meta.color;});
    d3.selectAll('.pca_datapoint')
        .attr('fill', function(d){return d.meta.color;});
}

/**
* Parses the highlght selections made in the lineage picker controls, and then
* sets the 'color' attribute for each cell in cellmap based on the current 
* lineage picker selections. Called by updateCellColors() whenever a lineage 
* picker selection is changed.
*/
function setCellColors(){
    //Collect highlight classes
    var picker_sel = document.getElementsByClassName('selhi');
    var picker_col = document.getElementsByClassName('hicolor');
    var picker_logic = document.getElementsByClassName('loghi');
    var selections = [];
    var logic_sel = [];
    var colors = [];
    var picker_length = [];
    highlights = false;
    for(var i=1; i < picker_sel.length; i++){
        picker_length.push(picker_sel[i].selectedOptions.length);
        logic_sel.push(picker_logic[i].value);
        
        for(var j=0; j < picker_sel[i].selectedOptions.length; j++){
            var selected = picker_sel[i].selectedOptions[j].value;
            if(selected){
                highlights = true;
                var sel_type = selected.substr(0, 2);
                var sel_val = selected.substr(2);
                if(sel_type === 'cn'){
                    selections.push(cellLineageStr(sel_val));
                }else {
                    selections.push(celltypes[sel_val]);
                }
            
        }
        
        }
        colors.push(picker_col[i].value);
    }
    //Calculate whether a data point should be highlighted and if so what color(s)
    //it should get
    var blastregex = /^(P0|AB|P1|EMS|P2|E|MS|C|P3|D|P4|Z2|Z3)/;
    var linregex = /([aplrdv]+)$/;
    var pt_colors;
    var pt_part;
    var start;
    for(var cell_nm in cellmap){
        if(!cellmap.hasOwnProperty(cell_nm)){
            continue;
        }
        var cell = cellmap[cell_nm];
        pt_colors = []
        //for(i=0; i < selections.length; i++){
        for(var i=1; i < picker_sel.length; i++){
            pt_part = []
            if(i>1){start = (i-1)*picker_length[i-2];}
            else{start = 0;}
            for( var j=0; j < picker_length[i-1]; j++){
                if(typeof selections[start + j] === 'string' && selections[start+j].indexOf(cell.name) > -1){
                    pt_part.push($.Color(colors[i-1]));
                }else if(typeof selections[start+j] === 'object'){
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
                    if(blast === cell.name && cell.name in selections[start+j] 
                       && selections[start+j][cell.name].indexOf(cell.name) > -1){
                        pt_part.push($.Color(colors[i-1]));
                    }
                    continue;
                }
                var linsuffix = linmatch[1];

                //if a color should be assigned to this blast/lineage combo, get it
                if(blast in selections[start+j] && selections[start+j][blast].indexOf(linsuffix) > -1){
                    pt_part.push($.Color(colors[i-1]));
                }
            }
                        
           }
           // If we can intersection operation, only the point has the colors of the number as same as the number 0f multiple containers, then we add new color, otherwise, it's zero.'
           if(logic_sel[i-1]=="opIntersection"){
                if (pt_part.length ===picker_length[i-1])
                    {pt_colors = pt_colors.concat(pt_part[0])}
                else{pt_colors=pt_colors.concat([])}
                }
           else {pt_colors = pt_colors.concat(pt_part)}
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
* Function to erase and redraw cells in the 3D plot that should have changes in 
* radius due to changes in lineage picker selections.
* @callback - called whenever a lineage picker selection is changed
*/
function updateCellSize(){
    //find cells that are selected and are small, or cells that aren't selected 
    //and are big, erase them, and redraw
    var to_update = d3.selectAll('.datapoint')
        .filter(function(d){
            var scale = +$(this).attr('scale').split(',')[0];
            if((d.meta.selected && scale === 5) || //small and should be big
               (!d.meta.selected && scale > 5) || //big and should be small
               (!highlights && scale === 5)){      //reset any small to big
                return this;
            }else{
                return null;
            }
        });
    to_update.remove();
    plot3DView(to_update);
    
    var to_update = d3.selectAll('.small_multiples_datapoint')
        .filter(function(d){
            var rad = +$(this).attr('r');
            if((d.meta.selected && rad === (d.radius / 25)) ||
               (!d.meta.selected && rad > (d.radius / 25)) ||
               (!highlights && rad === (d.radius / 25))){
                return this;
            }else{
                return null;
            }
        });
    to_update.remove();
    plotXYSmallMultiple(to_update);
    plotXZSmallMultiple(to_update);
    plotYZSmallMultiple(to_update);

    var to_update = d3.selectAll('.pca_datapoint')
        .filter(function(d){
            var rad = +$(this).attr('r');
            if((d.meta.selected && rad === (d.radius / 15)) ||
               (!d.meta.selected && rad > (d.radius / 15)) ||
               (!highlights && rad === (d.radius / 15))){
                return this;
            }else{
                return null;
            }
        });
    to_update.remove();
}

/**
* update the plots to have the correct highlights when changes are made in 
* lineage picker selections
* @callback - final function called when the lineage picker selections are 
*             changed
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
* Function to load in the mapping of leaf nodes (cell names) to cell 
* descriptions, cell types, and tissue types. These are hierarchical 
* characterizations of the roles that cells play in the adult worm, and they are
* used in the lineage picker select boxes to highlight cells based on what 
* tissue or function they have in their fully differentiated state. This 
* function reads in these metadata values and maps them to concatenated names
* of cells so that cells that correspond to a particular cell/tissue type can be
* found by simply querying the cell name against the concatenation with 
* the .indexOf() string method.
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
        initializePCA();
        initializeSmallMultiples();
        initializeGeneExpressionPlot();
        initializeLineageTree(cellmap.P0);
        plotData(0, 5);
    });
}

/****************************************************************
 USER NODE SELECTION
****************************************************************/
/**
* Set the userselected attribute of a cell in the cellmap when a user clicks on 
* that cell, call userSelectPoints to add/remove highlights to the corresponding
* data point in the 3D plot and node in the lineage tree
* @param {string} cellname - the name of a cell that the user clicked on
* @callback - called when a user clicks on a 3D plot data point or a lineage 
*             tree node.
*/
function clickSelect(cellname){
    cellmap[cellname].userselected = !cellmap[cellname].userselected;
    var selection = [cellname];
    userSelectPoints(selection);
}

/**
* This function adds or removes outlines to user-selected or -deselected nodes
* @param {list} selection - list of cell name strings for cells that should have
*                           their user selections toggled
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

    //small_multiples
    d3.selectAll('.small_multiples_datapoint')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 ? this : null;})
        .attr('stroke', 'none')

    var snode = d3.selectAll('.small_multiples_datapoint')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 && d.meta.userselected ? this : null;})
        .attr('stroke', selectionColor)
        .attr('stroke-width', '2')

    // PCA
    d3.selectAll('.pca_datapoint')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 ? this : null;})
        .attr('stroke', 'none')

    var snode = d3.selectAll('.pca_datapoint')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 && d.meta.userselected ? this : null;})
        .attr('stroke', selectionColor)
        .attr('stroke-width', '2')

    // PCA
    d3.selectAll('.exprPlot_data_point')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 ? this : null;})
        .attr('stroke', 'none')


    d3.selectAll('.exprPlot_data_point')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 ? this : null;})
        .selectAll('.expr-plot-node-select').remove();

    var snode = d3.selectAll('.exprPlot_data_point')
        .filter(function(d){return selection.indexOf(d.meta.name) > -1 && d.meta.userselected ? this : null;})
        .insert('rect', ':first-child')
        .attr('class', 'expr-plot-node-select')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', selectionColor)
        .attr('x', 0)
        .attr('y', 0)
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
* @returns {d3 data selection} - a selection containing shape elements appended 
*                                to the to_plot selection. Used later in 
*                                plotData() to identify the names of the newly
*                                plotted cells, which are then used in plotting
*                                the lineage tree.
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
        .attr('onclick', '(function(e, obj) {clickSelect(obj.__data__.meta.name);})(event, this);');

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
    var width = $('#small_multiples').width(),
    height = Math.floor($('#small_multiples').height()/3);

    small_multiples_scale = d3.scale.linear()
              .domain([-300, 300])
              .range([0, width]);

 
    // Make the axes for the x-y chart
    var xyChart = d3.select('#small_multiples')
    .append('svg:svg')
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("preserveAspectRatio", "xMidYMid")
      .attr('class', 'small_multiples_chart')
      .attr('id', 'xyChart')
      .attr('onclick', 'setViewpoint(1)')

    var main = xyChart.append('g')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'main')   

    var g = main.append("svg:g")
        .attr('id', 'xy_data_points');


    // Make the axes for the x-z chart
    var xzChart = d3.select('#small_multiples')
    .append('svg:svg')
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr("preserveAspectRatio", "xMidYMid")
    .attr('class', 'small_multiples_chart')
    .attr('id', 'xzChart')
    .attr('onclick', 'setViewpoint(2)')

    var main = xzChart.append('g')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'main')   

    var g = main.append("svg:g")
        .attr('id', 'xz_data_points');

    // Make the axes for the x-z chart
    var yzChart = d3.select('#small_multiples')
    .append('svg:svg')
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr("preserveAspectRatio", "xMidYMid")
    .attr('class', 'small_multiples_chart')
    .attr('id', 'yzChart')
    .attr('onclick', 'setViewpoint(3)')

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
        .attr("cx", function (d) { return small_multiples_scale(-d.z); } )
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
* Initializes axes for PCA plot, appending to #pcaDiv div element.
*/
function initializePCA() {
    var width = $('#expressionPlotTabs').width(),
        height = $('#expressionPlotTabs').height();

    pca_scale_x = d3.scale.linear()
              .domain([-30, 10])
              .range([0, width]);

    pca_scale_y = d3.scale.linear()
              .domain([-15, 15])
              .range([0, height]);

 
    // Make the axes for the x-y chart
    var xyChart = d3.select('#pcaDiv')
    .append('svg:svg')
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("preserveAspectRatio", "xMidYMid")
      .attr('id', 'pcaChart')

    var main = xyChart.append('g')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'main')   

    var g = main.append("svg:g")
        .attr('id', 'pca_data_points');
}


/**
* Plots points on the PCA plot. intializePCA must be called first.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
*/
function plotPCA(to_plot) { 

    to_plot.append("svg:circle")
        .attr('class', 'pca_datapoint')
        .attr('id', function(d){return d.meta.name})
        .attr("cx", function (d) { return pca_scale_x(d.pc2); } )
        .attr("cy", function (d) { return pca_scale_y(d.pc3); } )
        .attr("r", function(d) {
            if(d.meta.selected || !highlights){
                return d.radius/10;
            }else{
                return  d.radius/15;
            }
        })
        .attr("fill", function (d) {return d.meta.color; } )
        .attr('opacity', 0.8)
        .attr('onclick', "calcGeneEnrichment($(this).attr('fill')); $('#geneModal').modal('show');");
//        .attr('data-toggle', 'tooltip')
//        .attr('title', function(d) {return d.meta.name})
//        .attr('data-trigger', 'hover')
//        .attr('data-placement', 'left')
//        .attr('data-html', 'true')
//        .attr('container', 'body')
//        .attr('data-container', 'body')
    // Add the popover behavior for cells
//    $(document).ready(function(){
//        $('.pca_datapoint').tooltip();   
//    });
}


/**
* Updates visible nodes on the lineage tree to show only specified cells by name.
* @param {list} cellnames - list of cell names (strings) for cells to show in 
*                           the lineage tree (all visible cells)
* @param {list} new_data_names - list of names of cells that should be newly 
*                                revealed on the lineage tree
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
* Plots the gene expression pattern for the cells passed in as datapoints. Each 
* element of the timepoint_data gets bound to an svg element that becomes a 
* column in the expression plot. The function then iterates over all of the 
* .exprPlot_data_point svgs, gets the expressed gene coordinates from the 
* corresponding data.expr property, and binds the expressed genes (actually 
* indices into gene_names for the entries corresponding to the names of the 
* expressed genes) to rect elements, sizing and coloring appropriately.
* @param {csvdata element} timepoint_data - data for the current time point
*/
function plotGeneExpression(timepoint_data){
    var changed = false;
    var expr_points = d3.select('#exprPlot').selectAll('.exprPlot_data_point')
    .data(timepoint_data, function (d){
        return d.meta.name + '_expr';
    });
    var old_rows = expr_points.exit();
    if(!old_rows.empty()){
        changed = true;
    }
    old_rows.remove();
    var new_rows = expr_points.enter().append('svg')
        .attr('class', 'exprPlot_data_point')
        .attr('id', function (d){
            return d.meta.name + '_expr';
        })
        .attr('y', 0)
        .attr('height', expr_gene_scale.rangeExtent()[1]);
    if(!new_rows.empty()){
        changed = true;
    }
    expr_points.each(function(d){
        var expressed = d3.select(this).selectAll('.exprPlot_data_point_rect')
            .data(d.expr, function(e){return e;});
        expressed.exit().remove();
        expressed.enter().append('rect')
            .attr('class', function(e){return 'exprPlot_data_point_rect _' + e;})
            .attr('id', function(e){return d.meta.name + '_' + gene_names[e];})
            .attr('y', function(e){return expr_gene_scale(gene_names[e]);})
            .attr('height', expr_gene_scale.rangeBand())
            .attr('x', '0')
            .attr('width', '100%')
            .attr('fill', d.meta.color)
            .attr('onclick', "calcGeneEnrichment($(this).attr('fill')); $('#geneModal').modal('show');");
//            .attr('data-toggle', 'tooltip')
//            .attr('title', function(d) {return '<b>Cell:</b> ' + this.id.split('_')[0] + '<br />' + '<b>Gene:</b> ' + this.id.split('_')[1] })
//            .attr('data-trigger', 'hover')
//            .attr('data-placement', 'bottom')
//            .attr('data-html', 'true')
//            .attr('container', 'body')
//            .attr('data-container', 'body')
        });
    if(changed){
        updateExprRowSize();
    }

        // Add the popover behavior for cells
//    $(document).ready(function(){
//        $('.exprPlot_data_point_rect').tooltip();   
//    });
}

/**
* Get all expression plot data points (columns representing cells in the 
* current time point), and adjust their width so that all columns have the same
* width.
*/
function updateExprRowSize(){
    var tpcells = namemap[timepoint % namemap.length];
    expr_cell_scale.domain(tpcells);
    d3.selectAll('.exprPlot_data_point')
        .attr('x', function(d){
            return expr_cell_scale(d.meta.name);
        })
        .attr('width', expr_cell_scale.rangeBand());
}

/**
* Get all rectangles representing expressed genes in the expression plot and 
* set them to the color of the corresponding cell as defined in the cellmap 
* data structure.
*/
function updateExprRectColors(){
    d3.select('#exprPlot').selectAll('.exprPlot_data_point_rect')
        .attr('fill', function(){
            return this.parentNode.__data__.meta.color;
            });
}

/* Initialize the gene expression plot by setting up the containing div and 
* svg group elements, and initializing the range of the scales.
*/
var expr_gene_scale = d3.scale.ordinal(),
expr_cell_scale = d3.scale.ordinal();
function initializeGeneExpressionPlot(){
    var width = $('#expressionPlotTabs').width(),
        height = $('#expressionPlotTabs').height();
    
    expr_gene_scale.domain(gene_names);
    expr_gene_scale.rangeBands([0, height]);
    expr_cell_scale.rangeBands([0, width]);

    var exprPlot = d3.select('#exprDiv')
        .append('svg:svg')
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMidYMid")
        .attr('class', 'exprPlot')
        .attr('id', 'exprPlot')
        .append('rect')
        .attr('x', '0')
        .attr('y', '0')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', '#ffffff');

    // Adds callback on click for tabbed interface
    $('.nav-tabs a').on('click', function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

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
    var tp_idx = time_point % csvdata.length;
    var timepoint_data = csvdata[tp_idx];
    var datapoints = scene.selectAll(".datapoint").data( timepoint_data, function(d){return d.meta.name;});
    datapoints.exit().remove();

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

    //plot data in 3D view
    var new_data = plot3DView(datapoints.enter())

    //plot gene expression patterns
    var pca_datapoints = d3.select('#pca_data_points').selectAll(".pca_datapoint").data( timepoint_data, function(d){return d.meta.name + '_xz';});
    pca_datapoints.exit().remove();
    plotPCA(pca_datapoints.enter());

    plotGeneExpression(timepoint_data);

    //use new_data to identify which nodes in the tree should be revealed
    var new_data_names = [];
    new_data.each(function(d){
        new_data_names.push(d.meta.name);
    });
    
    //plot the lineage tree
    var cellnames = timePointCellNames(timepoint_data);
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
        .attr("cx", function(row) {return small_multiples_scale(-row.z);})
        .attr("cy", function(row) {return small_multiples_scale(-row.y);})

    // transition pca points
    pca_datapoints.transition().ease(ease).duration(duration)
        .attr("cx", function(row) {return pca_scale_x(row.pc2);})
        .attr("cy", function(row) {return pca_scale_y(row.pc3);})

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
* Function to construct the name of a cell's parent based on the C. elegans
* cell naming conventions.
* @param {string} cellname - the name of the cell for which to find the parent
* @returns {string} parentname - the name of the parent cell
*/
function get_parent_name(cellname){
    if(cellname in blastpred){
        return blastpred[cellname];
    }else{
        return cellname.substr(0, cellname.length - 1);
    }
}

/**
* Comparator function to return lineage order of cell names
* @param {string} a - first cell name
* @param {string} b - second cell name
* @returns {int} cmpval - as required by the javascript array sort function,
*                         returns a value less than zero if a is "less than" b
*                         (i.e. comes before b in sort order), otherwise returns
*                         a value greater than zero.
*/
function lineageComparator(a,b){
    var astart = a.charAt(0),
    bstart = b.charAt(0),
    blastorder = 'AMECDPZ'
    if(astart === bstart){
        return a.localeCompare(b);
    }else{
        return blastorder.indexOf(astart) - blastorder.indexOf(bstart);
    }
}

/**
* Read in text data that is in csv format and parse it into the csvdata object.
* This function also populates the namemap array to allow lookups into the 
* time series data based on cell name, and the cellmap, which contains all 
* cell-level metadata.
* @param {text from file} csvdata_in - file text generated by a call to d3.text
*/
//globals to allow parseCSV to work even if a time point is split across csvs
var tp = 1,
tpdata = [],
tpnames = [];
function parseCSV(csvdata_in) {
    var rows = d3.csv.parseRows(csvdata_in);
    if(tp === 1){
        gene_names = $.trim(rows[0][rows[0].length - 1]).split(' ');
    }
    for (var i=1; i < rows.length; i++){
        row = rows[i];
        if(+row[1] != tp){
            csvdata[tp - 1] = tpdata.sort(function(a,b){
                return lineageComparator(a.meta.name, b.meta.name);
            });
            namemap[tp - 1] = tpnames.sort(function(a,b){
                return lineageComparator(a, b);
            });
            tp = +row[1];
            tpdata = [];
            tpnames = [];
        }
        //Set up cellmap in parallel with csvdata
        var cellname = row[0].trim().replace(/\s/g, '_');
        var cell;
        if(cellname in cellmap){
            cell = cellmap[cellname];
        }else{
            cell = {'name':cellname,
                    'birthtp':+row[6] - 1,
                    'lifespan':+row[7],
                    'parent':-1,
                    'children': [],
                    'selected':false,
                    'userselected':false,
                    'color':defaultColor
            };
            cellmap[cellname] = cell;
            if(cellname != 'P0'){
                var parent_name = get_parent_name(cellname);
                cellmap[cellname].parent = cellmap[parent_name];
                cellmap[parent_name].children.push(cellmap[cellname]);
            }
        }
        //assemble object for csvdata
        var expr_on = [];
        for(var c_idx=0; c_idx < row[10].length; c_idx++){
            if(row[10].charAt(c_idx) === '1'){
                expr_on.push(c_idx);
            }
        }

        tpdata.push({'x': +row[2],
                     'y': +row[3],
                     'z': +row[4] * 11.1,
                     'radius': +row[5],
//                     'pc1': +row[6],
                     'pc2': +row[8],
                     'pc3': +row[9],
                     'first_tp': cell.birthtp === tp - 1 ? -1 : csvdata[cell.birthtp][namemap[cell.birthtp].indexOf(cell.name)],
                     'expr':expr_on,
                     'pred': -1,
                     'succ': [],
                     'meta':cell
        });
        tpnames.push(cellname);
        
        //Set up predecessor/successor
        if(tp > 1){
            var pred_idx = namemap[tp - 2].indexOf(cellname);
            if(pred_idx === -1){
               pred_idx = namemap[tp - 2].indexOf(get_parent_name(cellname));
            }
            tpdata[tpdata.length - 1].pred = csvdata[tp - 2][pred_idx];
            csvdata[tp - 2][pred_idx].succ.push(tpdata[tpdata.length - 1]);
        }
    }
}

/**
* Takes a gene name, looks up its wormbase.org ID and constructs the url to
* the wormbase.org page about that gene.
* @param {string} gene - gene name for which the corresponding wormbase.org url
*                        should be generated
* @returns {string} url - the wormbase.org url for the info about that gene
*/
function makeWormBaseUrl(gene){
    var wb = wormbase_map[gene].wb_id;
    return 'http://www.wormbase.org/db/get?name=' + wb + ';class=Gene';
}

/**
* Reads in the csv file mapping gene names to wormbase.org IDs and stores this
* mapping in a global object, wormbase_map. The wormbase.org IDs are used to
* construct URLs for use in links where users can find more info about genes.
*/
function loadWormBaseIdMap(){
    var url = 'wormbase_id_map.csv';
    console.log(url)
    d3.text(url, function(id_map){
        var rows = d3.csv.parseRows(id_map);
        for(var i=1; i < rows.length; i++){
            //map gene name to wormbase id
            wormbase_map[rows[i][0]] = {'wb_id': rows[i][1]};
        }
    });
}

/**
* Function to calculate gene-specific metrics with respect to a particular 
* set of highlighted cells. When a user clicks on a rect in the gene expression
* plot this function is called with the color of that rect as a parameter. Then
* metrics for all the genes are calculated, and they are displayed in a sortable
* table in the geneModal modal dialog.
* @param {string} selcolor - color of the rect in hex format
*/
function calcGeneEnrichment(selcolor){
    var popsize = csvdata[timepoint % csvdata.length].length;
    var selrows = d3.selectAll('.exprPlot_data_point')
        .filter(function(d){
            return d.meta.color === selcolor ? this : null;
        });
    var gene_name,
    gene_exp,
    gene_exp_sel,
    pval;
    for(var i=0; i < gene_names.length; i++){

        gene_name = gene_names[i];
        
        // Some gene names load with a period when they have a dash in the map, this normalizes names
        // to make sure gene names always match those in the map.
        if ( !(gene_name in wormbase_map)) {
          gene_name = gene_name.replace('.', '-')
        }

        gene_exp = $('._'+i);
        gene_exp_sel = selrows.selectAll('._'+i);
        wormbase_map[gene_name].frac_exp = gene_exp.length/popsize;
        wormbase_map[gene_name].frac_exp_sel = gene_exp_sel.size()/selrows.size();
        if(gene_exp.length === 0){
            pval = 1;
        }else{
            pval = jStat.hypgeom.pdf(gene_exp_sel.size(), popsize, 
                                     gene_exp.length,selrows.size());
            //Bonferroni correction for multiple testing
            pval *= gene_names.length;
            pval = pval > 1 ? 1 : pval;
        }
        wormbase_map[gene_name].pval = pval;
    }
    printGeneTable();
}

/**
* Function to populate the modal dialog "geneModal", which contains a report on
* the enrichment of genes for a particular selection. 
* Triggered from calcGeneEnrichment.
*/
function printGeneTable(){
    var table = d3.select('#gene_report_body'), 
        row;
    table.selectAll('tr').remove();
    $('#gene_report').trigger("update");
    for(var gene in wormbase_map){
        row = table.append('tr')
        row.append('td').text(gene);
        row.append('td')
            .append('a')
            .attr('href', makeWormBaseUrl(gene))
            .attr('target', '_blank')
            .text(wormbase_map[gene].wb_id);
        row.append('td').text(wormbase_map[gene].frac_exp);
        row.append('td').text(wormbase_map[gene].frac_exp_sel);
        row.append('td').text(wormbase_map[gene].pval);
    }
    $('#gene_report').trigger("update");
    var sorting = [[4,0]];
    $('#gene_report').trigger("sorton", [sorting]);
}

/**
* Read in the csv file at the URL specified in the url variable, parse the rows
* using parseCSV, and then iterate over the parsed csvdata objects, storing all
* meta attributes in the cellmap object to avoid storing duplicate metadata
*/
function loadTimePoints(file_idx){
    var url = 'exprTable/ImageExpressionTable.lifespan.timesort.fixed.centered.binary.clustered.pca.expstr.' + file_idx + '.csv';
    console.log(url);
    d3.text(url, function(tpdata){
        if(!tpdata){
            ready = true;
            d3.select('#timerange').attr('max', csvdata.length - 1);
            //load cell type data
            loadCellTypeMap();
            return;
        }
        parseCSV(tpdata);
        loadTimePoints(file_idx + 1);
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
  setViewpoint(0);
  x3d.node().runtime.resetView();
}


/**
* Sets the 3D viewpoint of the 3D plot to one of three predefined viewpoints relies on global variable currentViewpoint.
* @param {int} viewPoint - the number (1-3) of viewpoint to set 
* @callback - callback function for small multiples
*/
function setViewpoint(viewPoint) {
    var viewPointChange = viewPoint - currentViewpoint
      
    if (viewPointChange > 0) {
        for (var i = 0; i < Math.abs(viewPointChange); i++) {
            x3d.node().runtime.nextView()
            currentViewpoint++;
        }
    } else if (viewPointChange < 0) {
        for (var i = 0; i < Math.abs(viewPointChange); i++) {
            x3d.node().runtime.prevView()
            currentViewpoint--;
        }
    }    
}


function hideControls() {
    if(! controls_hidden) {
        controls_hidden = true;
        $('#divControls').animate({width: "0px"}, 500, function() {});
        $('#hide-controls').attr('value', '>')
        $('#divPlot').animate({margin: "0", width: "100%"}, 500, function() {});
    } else {
        controls_hidden = false;
        $('#divControls').animate({width: "415"}, 500, function() {});
        $('#hide-controls').attr('value', '<')
        $('#divPlot').animate({"margin-left": "415", "width": "-=415px"}, 500, function() {});
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

  var tree_div = d3.select(".lineage_tree")

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
      .sort(function(a, b) { return lineageComparator(a.name, b.name); });

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
    x3d = d3.select('x3d')
    scene = x3d.append("scene")

    // Define the four different viewpoints (ISO and each of the small multiples)
    scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-300, -300, 800, 800])
        .attr( "orientation", [-0.5, 1, 0.2, 1.12*Math.PI/4])
        .attr( "position", [600, 150, 800])

    scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-300, -300, 800, 800])
        .attr( "orientation", [0, 0, 0, 0])
        .attr( "position", [-100, -200, 800])

    scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-300, -300, 800, 800])
        .attr( "orientation", [0, 0, 0, 0])
        .attr( "position", [-100, -200, 800])

    scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-300, -300, 800, 800])
        .attr( "orientation", [0, 1.5, 0, 3.14/2])
        .attr( "position", [600, -200, 250])


    console.log("Reading in embryo positions.");
    loadTimePoints(0);
    console.log("Loading data");
    loadWormBaseIdMap();

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
