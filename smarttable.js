function smartTable() {
    //MAPPING FUNCTIONS
    /* populate a two-dimensional array representing every possible cell in the
     * html table, indexed by row then column; each location contains a jQuery
     * object representing that position in the table; multiple locations in the
     * array may point to the same jQuery object if that cell contains a colspan
     * or rowspan greater than 1
     */
    function map(cell) {
        var table = cell.closest('table');
        var columns = table.find('> colgroup > col');
        var rows = table.find('> tbody > tr');
        var cellMap = [];
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

                cell.attr('data-smart-table-row', rIndex);
                cell.attr('data-smart-table-col', cIndex);

                for(var r=0; r<rowspan; r++) {
                    for(var c=0; c<colspan; c++) {
                        cellMap[rIndex+r][cIndex+c] = cell;
                    }
                }
                cIndex += colspan;
            });
            rIndex++;
        });

        return cellMap;
    }

    //log out cellMap; print cell ids in rows and columns
    function debugMap(cellMap) {
        var nextID = 1;

        var table = cellMap[0][0].closest('table');

        table.find('> tbody > tr > td').each(function() {
            $(this).attr('data-smart-table-id', nextID);
            nextID++;
        });

        var map = [];
        var visited = [];
        var row, cell;
        for(var r=0; r<cellMap.length; r++) {
            row = cellMap[r];
            map.push(new Array(row.length));
            for(var c=0; c<row.length; c++) {
                cell = row[c];
                if(visited.indexOf(cell) == -1) visited.push(cell);
                map[r][c] = cell.attr('data-smart-table-id');
            }
        }
        console.log(JSON.stringify(map).replace(/\],\[/g, "\n").replace("[[", "").replace("]]", ""));
    }

    //find every adjacent cell in a given direction
    function getNeighbors(cell, side, strict) {
        var cellMap = map(cell);

        var rIndex = parseInt(cell.attr('data-smart-table-row'), 10);
        var cIndex = parseInt(cell.attr('data-smart-table-col'), 10);

        var rowspan = parseInt(cell.prop('rowspan'), 10);
        var colspan = parseInt(cell.prop('colspan'), 10);

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
                            ncIndex = parseInt(neighbor.attr('data-smart-table-col'), 10);
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
                        nrIndex = parseInt(neighbor.attr('data-smart-table-row'), 10);
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
    function getColumn(cell) {
        var cellMap = map(cell);

        return cell.closest('table').find('> colgroup > col').eq(cell.attr('data-smart-table-col'));
    }

    function widthSet(col, width) {
        col.attr('data-smart-table-width', width);
        col.css('width', width+'%');
    }

    function widthInc(col, target, inc) {
        var twidth = parseInt(target.attr('data-smart-table-width'), 10);
        twidth -= inc;
        if(twidth > 0) {
            var cwidth = parseInt(col.attr('data-smart-table-width'), 10);
            cwidth += inc;
            if(cwidth > 0) {
                widthSet(target, twidth);
                widthSet(col, cwidth);
            }
        }
    }

    function widthLeft(cell, inc) {
        var col = getColumn(cell);
        if(typeof inc != 'number') inc = 1;
        var target = col.prev('col');
        widthInc(col, target, inc);
    }

    function widthRight(cell, inc) {
        var col = getColumn(cell);
        if(typeof inc != 'number') inc = 1;
        var target = col.next('col');
        widthInc(col, target, inc);
    }

    //LAYOUT FUNCTIONS
    function expandRow(cellMap, rIndex) {
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

    function collapseRow(cellMap, rIndex, increment) {
        if(increment != -1) increment = 1;

        var rows = table.find('> tbody > tr');

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
        }
    }

    function collapseColumn(cellMap, cIndex, increment) {
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
            var columns = table.find('> colgroup > col');
            var col = columns.eq(cIndex);
            var nCol = columns.eq(cIndex+increment);
            var width = parseInt(col.attr('data-smart-table-width'), 10) + parseInt(nCol.attr('data-smart-table-width'), 10);
            col.attr('data-smart-table-width', width);
            col.css('width', width+'%');
            col.text(width);
            nCol.remove();
        }
    }

    function bottomLeftNeighbor(cell, rIndex, cIndex) {
        var rows = cell.closest('table').find('> tbody > tr');

        var nRow = rows.eq(rIndex);
        var neighbor;
        //find the last cell left of this one in the next row down
        nRow.find('> td').each(function() {
            if($(this).attr('data-smart-table-col') < cIndex) neighbor = $(this);
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
    function split(cell, dir) {
        var cellMap = map(cell);

        var rotation = dirRotation(dir);
        var magnitude = dirMagnitude(dir);

        var rIndex = parseInt(cell.attr('data-smart-table-row'), 10);
        var cIndex = parseInt(cell.attr('data-smart-table-col'), 10);

        var rows = cell.closest('table').find('> tbody > tr');

        //vertical
        if(!rotation) {
            //up
            if(!magnitude) {
                if(cell.prop('rowspan') == 1) {
                    expandRow(cellMap, rIndex);
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
                        neighbor = bottomLeftNeighbor(cell, rIndex, cIndex);
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
                    expandRow(cellMap, rIndex);
                    cell.prop('rowspan', cell.prop('rowspan') - 1);
                    var newCell = cell.clone(true).prop('rowspan', 1).removeClass('smart-table-active');
                    var newRow = $("<TR></TR>").append(newCell);
                    rows.eq(rIndex).after(newRow);
                } else {
                    cell.prop('rowspan', cell.prop('rowspan') - 1);
                    rIndex += parseInt(cell.prop('rowspan'), 10);
                    var newCell = cell.clone(true).prop('rowspan', 1).removeClass('smart-table-active');
                    if(cIndex > 0) {
                        neighbor = bottomLeftNeighbor(cell, rIndex, cIndex);
                        neighbor.after(newCell);
                    } else {
                        rows.eq(rIndex).prepend(newCell);
                    }
                }
            }

        //horizontal
        } else {
            if(cell.prop('colspan') == 1) {
                var columns = cell.closest('table').find('> colgroup > col');
                var col = columns.eq(cIndex);
                var width = col.attr('data-smart-table-width');
                var left = parseInt(Math.ceil(width/2), 10);
                col.width(left+'%');
                col.attr('data-smart-table-width', left);
                col.text(left);
                var newCol = col.clone();
                var right = Math.floor(width/2);
                newCol.width(right+'%');
                newCol.attr('data-smart-table-width', right);
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
    }

    function merge(cell, dir) {
        var cellMap = map(cell);

        var rotation = dirRotation(dir);
        var magnitude = dirMagnitude(dir);

        var rIndex = parseInt(cell.attr('data-smart-table-row'), 10);
        var cIndex = parseInt(cell.attr('data-smart-table-col'), 10);

        //vertical
        if(!rotation) {
            //up
            if(!magnitude) {
                var nIndex = rIndex - 1;
                if(nIndex >= 0) {
                    var neighbor = cellMap[nIndex][cIndex];
                    if(neighbor && !neighbor.hasClass('smart-table-layout') && neighbor.prop('colspan') == cell.prop('colspan')) {
                        if(cIndex == 0 || cellMap[nIndex][cIndex-1] != neighbor) {
                            cell.prop('rowspan', cell.prop('rowspan') + neighbor.prop('rowspan'));
                            neighbor.after(cell);
                            neighbor.remove();
                        }
                    }

                    cellMap = map(cell);

                    collapseRow(cellMap, rIndex, -1);
                }
            //down
            } else {
                var nIndex = rIndex + cell.prop('rowspan');
                if(nIndex < cellMap.length) {
                    var neighbor = cellMap[nIndex][cIndex];
                    if(neighbor && !neighbor.hasClass('smart-table-layout') && neighbor.prop('colspan') == cell.prop('colspan')) {
                        if(cIndex == 0 || cellMap[nIndex][cIndex-1] != neighbor) {
                            cell.prop('rowspan', cell.prop('rowspan') + neighbor.prop('rowspan'));
                            neighbor.remove();
                        }
                    }

                    cellMap = map(cell);

                    collapseRow(cellMap, nIndex, -1);
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
                nIndex = parseInt(neighbor.attr('data-smart-table-col'), 10);
            }

            if(neighbor && neighbor.prop('rowspan') == cell.prop('rowspan')) {
                cell.prop('colspan', cell.prop('colspan') + neighbor.prop('colspan'));
                neighbor.remove();
            }

            cellMap = map(cell);
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
                var columns = cell.closest('table').find('> colgroup > col');
                var col = columns.eq(nIndex+increment);
                var nCol = columns.eq(nIndex);
                var width = parseInt(col.attr('data-smart-table-width'), 10) + parseInt(nCol.attr('data-smart-table-width'), 10);
                col.attr('data-smart-table-width', width);
                col.css('width', width+'%');
                col.text(width);
                nCol.remove();
            }
        }
    }

    function splitRow(cell, dir) {
        var rIndex = parseInt(cell.attr('data-smart-table-row'), 10);

        var visited = [];
        var testCell;
        for(var i in cellMap[rIndex]) {
            testCell = cellMap[rIndex][i];
            if(visited.indexOf(testCell) == -1) {
                visited.push(testCell);
            }
        }
        for(var i in visited) {
            split(cell, dir, visited[i]);
        }
    }

    function removeRow(cell) {
        var cellMap = map(cell);

        var rIndex = parseInt(cell.attr('data-smart-table-row'), 10);
        var cIndex = parseInt(cell.attr('data-smart-table-col'), 10);

        var rows = table.find('> tbody > tr');

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

        cellMap = map(cell);

        var columns = cell.closest('table').find('> colgroup > col');

        for(var c=columns.length-1; c>0; c--) {
            collapseColumn(cellMap, c, -1);
        }
    }

    this.split = split;
    this.merge = merge;
}
