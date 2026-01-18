// This function assumes that the list has properties id and parentId. There is
// an assumption that there's only one root node (parentId will be null).
export class TreeUtilsService {

  // Helper function
  addChildNodesWithChildrenPropertyName(
    item: any,
    parentIdMap: Map<string, any[]>) {

    // Create node. Create a shallow copy of the object to prevent the "Object
    // is not extensible" error on the next line.
    var node = { ...item }
    node.children = []

    // Add child nodes
    const childItems = parentIdMap.get(node.id)

    // console.log(`.  childItems: ${JSON.stringify(childItems)}`)

    if (childItems !== undefined) {
      for (const childItem of childItems) {

        const childNode = this.addChildNodesWithChildrenPropertyName(
                            childItem,
                            parentIdMap)

        node.children.push(childNode)
      }
    }

    return node
  }

  listToTree(
    list: any[],
    childNodesPropertyName: string = 'children') {

    // Convert to maps indexed by id and parentId, also get the root node
    var node: any = null
    var idMap = new Map<string, any>()
    var parentIdMap = new Map<string, any[]>()

    for (const item of list) {
      idMap.set(item.id, item)

      if (item.parentId === null) {
        // Root node has parentId of null
        node = item
      } else {
        // Populate parentIdMap except for root node which has parentId of null.
        // Null can't be an index to a map anyway.
        var parentItems = parentIdMap.get(item.parentId)

        if (parentItems === undefined) {
          parentItems = [item]
        } else {
          parentItems.push(item)
        }

        parentIdMap.set(item.parentId, parentItems)
      }
    }

    // console.log(`.  parentIdMap: ${JSON.stringify(parentIdMap)}`)

    // Copy the idMap to a new map that tracks which items have yet to be added
    // to the tree. Remove the root node.
    var itemsNotAdded = idMap

    if (node === null) {
      throw 'A root node wasn\'t identified'
    } else {
      itemsNotAdded.delete(node.id)
    }

    // Create the tree
    if (childNodesPropertyName === 'children') {
      node = this.addChildNodesWithChildrenPropertyName(
               node,
               parentIdMap)
    } else {
      throw `Unhandled childNodesPropertyName: ${childNodesPropertyName}`
    }

    // Return root node
    return node
  }
}
