function smartTable(table, params) {
    var columns, rows, cellMap, activeCell;
    var nextID = 1;

    table.find('> tbody > tr > td').on('click', selectCell).each(function() {
        $(this).attr('data-smart-table-id', nextID);
        nextID++;
    });

    //MAPPING FUNCTIONS
    /* populate a two-dimensional array representing every possible cell in the
     * html table, indexed by row then column; each location contains a jQuery
     * object representing that position in the table; multiple locations in the
     * array may point to the same jQuery object if that cell contains a colspan
     * or rowspan greater than 1
     */
    function map() {
        columns = table.find('> colgroup > col');
        rows = table.find('> tbody > tr');
        cellMap = [];
        rows.each(function() {
            cellMap.push(new Array(columns.length));
        });

        var rIndex = 0;
        rows.each(function() {
            var cells = $(this).find('> td');
            var cIndex = 0;
            cells.each(function() {
                var cell = $(this);
                while(true) {
                    //rowspans in previous rows may occupy positions in this row
                    if(typeof(cellMap[rIndex][cIndex]) == 'object') {
                        cIndex++;
                    } else {
                        break;
                    }
                }

                var colspan = cell.prop('colspan');
                if(colspan) colspan = parseInt(colspan, 10);
                else colspan = 1;
                cell.prop('colspan', colspan);

                var rowspan = cell.prop('rowspan');
                if(rowspan) rowspan = parseInt(rowspan, 10);
                else rowspan = 1;
                cell.prop('rowspan', rowspan);

                cell.attr('data-row', rIndex);
                cell.attr('data-col', cIndex);

                for(var r=0; r<rowspan; r++) {
                    for(var c=0; c<colspan; c++) {
                        cellMap[rIndex+r][cIndex+c] = cell;
                    }
                }
                cIndex += colspan;
            });
            rIndex++;
        });

        debugMap();
    }

    //log out cellMap; print cell ids in rows and columns
    function debugMap() {
        var map = [];
        var visited = [];
        for(var r=0; r<cellMap.length; r++) {
            var row = cellMap[r];
            map.push(new Array(row.length));
            for(var c=0; c<row.length; c++) {
                var cell = row[c];
                if(visited.indexOf(cell) == -1) visited.push(cell);
                map[r][c] = cell.attr('data-smart-table-id');
            }
        }
        console.log(JSON.stringify(map).replace(/\],\[/g, "\n").replace("[[", "").replace("]]", ""));
    }

    //find every adjacent cell in a given direction
    function getNeighbors(side, strict) {
        var rIndex = parseInt(activeCell.attr('data-row'), 10);
        var cIndex = parseInt(activeCell.attr('data-col'), 10);
        var rowspan = parseInt(activeCell.prop('rowspan'), 10);
        var colspan = parseInt(activeCell.prop('colspan'), 10);
        var neighbors = $();
        var nIndex, neighbor;

        if(side == 'top' || side == 'bottom') {
            if(side == 'top') nIndex = rIndex - 1;
            else nIndex = rIndex + rowspan;

            if(cellMap[nIndex]) {
                var ncolspan, ncIndex;
                for(var i=0; i<colspan; i++) {
                    neighbor = cellMap[nIndex][cIndex+i];
                    if(neighbor) {
                        if(strict) {
                            ncIndex = parseInt(neighbor.attr('data-col'), 10);
                            ncolspan = parseInt(neighbor.prop('colspan'), 10);
                            if(ncIndex >= cIndex && ncolspan + i <= colspan) neighbors = neighbors.add(neighbor);
                        } else {
                            neighbors = neighbors.add(neighbor);
                        }
                    }
                }
            }

        } else if(side == 'left' || side == 'right') {
            if(side == 'left') nIndex = cIndex - 1;
            else nIndex = cIndex + colspan;

            var nrowspan, nrIndex;
            for(var i=0; i<rowspan; i++) {
                neighbor = cellMap[rIndex+i][nIndex];
                if(neighbor) {
                    if(strict) {
                        nrIndex = parseInt(neighbor.attr('data-row'), 10);
                        nrowspan = parseInt(neighbor.prop('rowspan'), 10);
                        if(nrIndex >= rIndex && nrowspan + i <= rowspan) neighbors = neighbors.add(neighbor);
                    } else {
                        neighbors = neighbors.add(neighbor);
                    }
                }
            }
        }

        return neighbors;
    }

    //COLUMN FUNCTIONS
    function widthSet(col, width) {
        col.attr('data-width', width);
        col.css('width', width+'%');
    }

    function widthInc(col, target, inc) {
        var twidth = parseInt(target.attr('data-width'), 10);
        twidth -= inc;
        if(twidth > 0) {
            var cwidth = parseInt(col.attr('data-width'), 10);
            cwidth += inc;
            if(cwidth > 0) {
                widthSet(target, twidth);
                widthSet(col, cwidth);
            }
        }
    }

    function widthLeft(inc) {
        var col = columns.eq(activeCell.attr('data-col'));
        if(typeof inc != 'number') inc = 1;
        var target = col.prev('col');
        widthInc(col, target, inc);
    }

    function widthRight(inc) {
        var col = columns.eq(activeCell.attr('data-col'));
        if(typeof inc != 'number') inc = 1;
        var target = col.next('col');
        widthInc(col, target, inc);
    }

    //LAYOUT FUNCTIONS
    function expandRow(rIndex) {
        var cells = cellMap[rIndex];
        var visited = [];
        var testCell;
        for(var c=0; c<cells.length; c++) {
            testCell = cells[c];
            if(visited.indexOf(testCell) == -1) {
                visited.push(testCell);
                testCell.prop('rowspan', parseInt(testCell.prop('rowspan'), 10) + 1);
            }
        }
    }

    function collapseRow(rIndex, increment) {
        if(increment != -1) increment = 1;

        var row = rows.eq(rIndex);
        if(row.find('> td').length == 0) {
            row.remove();
            var visited = [];
            var cells = cellMap[rIndex+increment];
            var testCell;
            for(var c=0; c<cells.length; c++) {
                testCell = cells[c];
                if(visited.indexOf(testCell) == -1) {
                    visited.push(testCell);
                    testCell.prop('rowspan', testCell.prop('rowspan') - 1);
                }
            }
            map();
        }
    }

    function collapseColumn(cIndex, increment) {
        if(increment != -1) increment = 1;

        var merge = true;
        for(var i in cellMap) {
            var row = cellMap[i];
            if(row[cIndex] != row[cIndex+increment]) {
                merge = false;
                break;
            }
        }

        if(merge) {
            var visited = [];
            var testCell;
            for(var i in cellMap) {
                testCell = cellMap[i][cIndex+increment];
                if(visited.indexOf(testCell) == -1) {
                    visited.push(testCell);
                    testCell.prop('colspan', testCell.prop('colspan') - 1);
                }
            }
            var col = columns.eq(cIndex);
            var nCol = columns.eq(cIndex+increment);
            var width = parseInt(col.attr('data-width'), 10) + parseInt(nCol.attr('data-width'), 10);
            col.attr('data-width', width);
            col.css('width', width+'%');
            col.text(width);
            nCol.remove();
            map();
        }
    }

    function bottomLeftNeighbor(rIndex, cIndex) {
        var nRow = rows.eq(rIndex);
        var neighbor;
        //find the last cell left of this one in the next row down
        nRow.find('> td').each(function() {
            if($(this).attr('data-col') < cIndex) neighbor = $(this);
            else return false;
        });

        return neighbor;
    }

    //true = horizontal, false = vertical
    function dirRotation(dir) {
        if(dir == 'left' || dir == 'right') return true;
        else return false;
    }

    //true = positive, false = negative
    function dirMagnitude(dir) {
        if(dir == 'down' || dir == 'right') return true;
        else return false;
    }

    //split cell by decreasing colspan/rowspan and appending new cell
    function split(dir, cell) {
        var rotation = dirRotation(dir);
        var magnitude = dirMagnitude(dir);

        if(!cell) cell = activeCell;
        var rIndex = parseInt(cell.attr('data-row'), 10);
        var cIndex = parseInt(cell.attr('data-col'), 10);

        //vertical
        if(!rotation) {
            //up
            if(!magnitude) {
                if(cell.prop('rowspan') == 1) {
                    expandRow(rIndex);
                    var newCell = cell.clone(true);
                    cell.prop('rowspan', 1);
                    newCell.prop('rowspan', newCell.prop('rowspan') - 1).removeClass('smart-table-active');
                    cell.after(newCell);
                    var newRow = $("<TR></TR>").append(cell);
                    newCell.parent().after(newRow);
                    var tmp = cell;
                    cell = newCell;
                    newCell = tmp;
                } else {
                    cell.prop('rowspan', cell.prop('rowspan') - 1);
                    rIndex++;
                    var newCell = cell.clone(true).prop('rowspan', 1).removeClass('smart-table-active');
                    if(cIndex > 0) {
                        neighbor = bottomLeftNeighbor(rIndex, cIndex);
                        cell.after(newCell);
                        neighbor.after(cell);
                    } else {
                        cell.after(newCell);
                        rows.eq(rIndex).prepend(cell);
                    }
                }
            //down
            } else {
                if(cell.prop('rowspan') == 1) {
                    expandRow(rIndex);
                    cell.prop('rowspan', cell.prop('rowspan') - 1);
                    var newCell = cell.clone(true).prop('rowspan', 1).removeClass('smart-table-active');
                    var newRow = $("<TR></TR>").append(newCell);
                    rows.eq(rIndex).after(newRow);
                } else {
                    cell.prop('rowspan', cell.prop('rowspan') - 1);
                    rIndex += parseInt(cell.prop('rowspan'), 10);
                    var newCell = cell.clone(true).prop('rowspan', 1).removeClass('smart-table-active');
                    if(cIndex > 0) {
                        neighbor = bottomLeftNeighbor(rIndex, cIndex);
                        neighbor.after(newCell);
                    } else {
                        rows.eq(rIndex).prepend(newCell);
                    }
                }
            }

        //horizontal
        } else {
            if(cell.prop('colspan') == 1) {
                var col = columns.eq(cIndex);
                var width = col.attr('data-width');
                var left = parseInt(Math.ceil(width/2), 10);
                col.width(left+'%');
                col.attr('data-width', left);
                col.text(left);
                var newCol = col.clone();
                var right = Math.floor(width/2);
                newCol.width(right+'%');
                newCol.attr('data-width', right);
                newCol.text(right);
                col.after(newCol);

                var visited = [];
                var testCell;
                for(var r in cellMap) {
                    testCell = cellMap[r][cIndex];
                    if(visited.indexOf(testCell) == -1) {
                        visited.push(testCell);
                        var span = testCell.prop('colspan');
                        span++;
                        testCell.prop('colspan', span);
                    }
                }
            }

            cell.prop('colspan', cell.prop('colspan')-1);

            var newCell = cell.clone(true).prop('colspan', 1).removeClass('smart-table-active');

            //left
            if(!magnitude) cell.before(newCell);
            //right
            else cell.after(newCell);
        }

        newCell.on('click', selectCell).text('[%%]').attr('id', nextID);
        nextID++;
        if(cell.parent().hasClass('sr-tokenize')) newCell.parent().addClass('sr-tokenize');
        if(newCell.attr('data-module')) newCell.attr('data-module', 0);

        map();
    }

    function merge(dir, cell) {
        var rotation = dirRotation(dir);
        var magnitude = dirMagnitude(dir);

        if(!cell) cell = activeCell;
        var rIndex = parseInt(cell.attr('data-row'), 10);
        var cIndex = parseInt(cell.attr('data-col'), 10);

        //vertical
        if(!rotation) {
            //up
            if(!magnitude) {
                var nIndex = rIndex - 1;
                if(nIndex >= 0) {
                    var neighbor = cellMap[nIndex][cIndex];
                    if(neighbor && !neighbor.hasClass('sr-layout') && neighbor.prop('colspan') == cell.prop('colspan')) {
                        if(cIndex == 0 || cellMap[nIndex][cIndex-1] != neighbor) {
                            cell.prop('rowspan', cell.prop('rowspan') + neighbor.prop('rowspan'));
                            neighbor.after(cell);
                            neighbor.remove();
                        }
                    }

                    map();

                    collapseRow(rIndex, -1);
                }
            //down
            } else {
                var nIndex = rIndex + cell.prop('rowspan');
                if(nIndex < cellMap.length) {
                    var neighbor = cellMap[nIndex][cIndex];
                    if(neighbor && !neighbor.hasClass('sr-layout') && neighbor.prop('colspan') == cell.prop('colspan')) {
                        if(cIndex == 0 || cellMap[nIndex][cIndex-1] != neighbor) {
                            cell.prop('rowspan', cell.prop('rowspan') + neighbor.prop('rowspan'));
                            neighbor.remove();
                        }
                    }

                    map();

                    collapseRow(nIndex, -1);
                }
            }

        //horizontal
        } else {
            var increment = 0;
            var merge = true;
            var neighbor, nIndex;

            //left
            if(!magnitude) {
                increment = 1;
                neighbor = cell.prev();
                nIndex = cIndex - 1;

            //right
            } else {
                increment = -1;
                neighbor = cell.next();
                nIndex = parseInt(neighbor.attr('data-col'), 10);
            }

            if(neighbor && neighbor.prop('rowspan') == cell.prop('rowspan')) {
                cell.prop('colspan', cell.prop('colspan') + neighbor.prop('colspan'));
                neighbor.remove();
            }

            map();
            for(var i in cellMap) {
                var row = cellMap[i];
                if(row[nIndex] != row[nIndex+increment]) {
                    merge = false;
                    break;
                }
            }

            if(merge) {
                var visited = [];
                var testCell;
                for(var i in cellMap) {
                    testCell = cellMap[i][nIndex+increment];
                    if(visited.indexOf(testCell) == -1) {
                        visited.push(testCell);
                        testCell.prop('colspan', testCell.prop('colspan') - 1);
                    }
                }
                var col = columns.eq(nIndex+increment);
                var nCol = columns.eq(nIndex);
                var width = parseInt(col.attr('data-width'), 10) + parseInt(nCol.attr('data-width'), 10);
                col.attr('data-width', width);
                col.css('width', width+'%');
                col.text(width);
                nCol.remove();
                map();
            }
        }
    }

    function splitRow(dir) {
        var cell = activeCell;
        var rIndex = parseInt(cell.attr('data-row'), 10);

        var visited = [];
        var testCell;
        for(var i in cellMap[rIndex]) {
            testCell = cellMap[rIndex][i];
            if(visited.indexOf(testCell) == -1) {
                visited.push(testCell);
            }
        }
        for(var i in visited) {
            split(dir, visited[i]);
        }
    }

    function removeRow() {
        var cell = activeCell;
        var rIndex = parseInt(cell.attr('data-row'), 10);
        var cIndex = parseInt(cell.attr('data-col'), 10);

        var row = rows.eq(rIndex);

        var visited = [];
        var testCell, rowspan;
        for(var i in cellMap[rIndex]) {
            testCell = cellMap[rIndex][i];
            if(visited.indexOf(testCell) == -1) {
                visited.push(testCell);
                rowspan = parseInt(testCell.prop('rowspan'), 10);
                if(rowspan <= 1) testCell.remove();
                else testCell.prop('rowspan', testCell.prop('rowspan') - 1);
            }
        }
        row.remove();
        map();

        for(var c=columns.length-1; c>0; c--) {
            collapseColumn(c, -1);
        }
    }

    map();
}
