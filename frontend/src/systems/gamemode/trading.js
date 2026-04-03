/**
 * Trading Game Mode
 * Economic gameplay with merchant trading between ports
 * Players establish trade routes, buy/sell commodities, manage inventory
 */

export class TradingMode {
  constructor() {
    this.isActive = false;
    this.matchId = null;
    this.ports = new Map(); // portId -> portData
    this.tradeRoutes = new Map(); // routeId -> routeData
    this.playerInventories = new Map(); // playerId -> inventory
    this.marketPrices = new Map(); // commodityId -> price (fluctuates)
    this.portCounter = 0;
    this.routeCounter = 0;
    this.matchState = 'waiting'; // waiting, active, ended
    this.startTime = null;
    this.commodities = ['spices', 'sugar', 'rum', 'cloth', 'iron', 'gold', 'timber'];
    this.profitGoal = 100000; // Gold needed to win
  }

  /**
   * Initialize trading mode
   */
  initializeMode(matchId) {
    this.matchId = matchId;
    this.isActive = true;
    this.matchState = 'waiting';
    this.playerInventories = new Map();
    this.ports = new Map();

    // Create port network at various locations
    this.createPort('port_north', 'Harbor North', 2000, 500, 'merchant_hub');
    this.createPort('port_south', 'Harbor South', 2000, 3500, 'merchant_hub');
    this.createPort('port_east', 'Trading Post East', 3600, 2000, 'trading_post');
    this.createPort('port_west', 'Trading Post West', 400, 2000, 'trading_post');
    this.createPort('port_center', 'Main Market', 2000, 2000, 'market');

    // Initialize market prices (with some randomness)
    this.commodities.forEach(commodity => {
      const basePrice = 100 + Math.random() * 100;
      this.marketPrices.set(commodity, basePrice);
    });

    console.log('✅ Trading Mode initialized with 5 ports');
  }

  /**
   * Create a trading port
   */
  createPort(portId, portName, x, y, portType = 'trading_post') {
    const port = {
      id: portId,
      name: portName,
      x: x,
      y: y,
      type: portType,
      inventory: {},
      demand: {},
      supply: {},
      dockingPlayers: new Set()
    };

    // Initialize inventory and supply/demand
    this.commodities.forEach(commodity => {
      port.inventory[commodity] = Math.floor(Math.random() * 500) + 100;
      port.supply[commodity] = Math.floor(Math.random() * 200) + 50;
      port.demand[commodity] = Math.floor(Math.random() * 200) + 50;
    });

    this.ports.set(portId, port);
    return port;
  }

  /**
   * Player docks at port
   */
  dockAtPort(playerId, portId) {
    const port = this.ports.get(portId);
    if (!port) return null;

    port.dockingPlayers.add(playerId);

    // Initialize inventory if doesn't exist
    if (!this.playerInventories.has(playerId)) {
      this.playerInventories.set(playerId, {
        playerId: playerId,
        gold: 1000, // Starting gold
        cargo: {},
        cargoCapacity: 500,
        cargoUsed: 0
      });

      // Initialize cargo
      this.commodities.forEach(commodity => {
        this.playerInventories.get(playerId).cargo[commodity] = 0;
      });
    }

    return {
      success: true,
      portId: portId,
      portName: port.name,
      inventory: port.inventory,
      playerInventory: this.playerInventories.get(playerId)
    };
  }

  /**
   * Undock from port
   */
  undockFromPort(playerId, portId) {
    const port = this.ports.get(portId);
    if (!port) return null;

    port.dockingPlayers.delete(playerId);

    return {
      success: true,
      portId: portId
    };
  }

  /**
   * Buy commodity from port
   */
  buyCommodity(playerId, portId, commodity, quantity) {
    const port = this.ports.get(portId);
    const inventory = this.playerInventories.get(playerId);

    if (!port || !inventory) return null;

    // Check if port has commodity
    if ((port.inventory[commodity] || 0) < quantity) {
      return { success: false, reason: 'Port does not have enough inventory' };
    }

    // Calculate cost (with market fluctuation)
    const price = this.marketPrices.get(commodity) || 100;
    const totalCost = price * quantity;

    if (inventory.gold < totalCost) {
      return { success: false, reason: 'Insufficient gold' };
    }

    // Check cargo space
    if (inventory.cargoUsed + quantity > inventory.cargoCapacity) {
      return { success: false, reason: 'Insufficient cargo space' };
    }

    // Execute transaction
    port.inventory[commodity] -= quantity;
    inventory.gold -= totalCost;
    inventory.cargo[commodity] = (inventory.cargo[commodity] || 0) + quantity;
    inventory.cargoUsed += quantity;

    // Adjust prices based on supply
    this.adjustMarketPrice(commodity, -quantity); // Price decreases as supply decreases

    return {
      success: true,
      commodity: commodity,
      quantity: quantity,
      costPer: price,
      totalCost: totalCost,
      goldRemaining: inventory.gold,
      cargoUsed: inventory.cargoUsed
    };
  }

  /**
   * Sell commodity to port
   */
  sellCommodity(playerId, portId, commodity, quantity) {
    const port = this.ports.get(portId);
    const inventory = this.playerInventories.get(playerId);

    if (!port || !inventory) return null;

    // Check if player has commodity
    if ((inventory.cargo[commodity] || 0) < quantity) {
      return { success: false, reason: 'Insufficient inventory' };
    }

    // Calculate revenue (with market fluctuation)
    const price = this.marketPrices.get(commodity) || 100;
    const totalRevenue = price * quantity;

    // Execute transaction
    inventory.cargo[commodity] -= quantity;
    inventory.gold += totalRevenue;
    inventory.cargoUsed -= quantity;
    port.inventory[commodity] = (port.inventory[commodity] || 0) + quantity;

    // Adjust prices based on demand
    this.adjustMarketPrice(commodity, quantity); // Price increases as supply increases

    return {
      success: true,
      commodity: commodity,
      quantity: quantity,
      pricePer: price,
      totalRevenue: totalRevenue,
      goldRemaining: inventory.gold,
      cargoUsed: inventory.cargoUsed
    };
  }

  /**
   * Adjust market price based on supply/demand
   */
  adjustMarketPrice(commodity, supplyChange) {
    const currentPrice = this.marketPrices.get(commodity) || 100;

    // Market fluctuation: supply change affects price
    const priceAdjustment = (supplyChange * 0.1); // 10% impact per unit
    const newPrice = Math.max(50, Math.min(500, currentPrice - priceAdjustment));

    this.marketPrices.set(commodity, newPrice);
  }

  /**
   * Create a trade route (for strategic planning)
   */
  createTradeRoute(playerId, startPortId, endPortId, commodity, profitGoal = 1000) {
    const startPort = this.ports.get(startPortId);
    const endPort = this.ports.get(endPortId);

    if (!startPort || !endPort) return null;

    const routeId = `route_${++this.routeCounter}`;
    const route = {
      id: routeId,
      playerId: playerId,
      startPortId: startPortId,
      endPortId: endPortId,
      commodity: commodity,
      profitGoal: profitGoal,
      estimatedProfit: this.estimateRouteProfit(startPortId, endPortId, commodity),
      status: 'active', // active, completed
      createdAt: Date.now()
    };

    this.tradeRoutes.set(routeId, route);

    return route;
  }

  /**
   * Estimate profit for a trade route
   */
  estimateRouteProfit(startPortId, endPortId, commodity) {
    const startPrice = this.marketPrices.get(commodity) || 100;

    // Price varies slightly by location (simplified)
    const locationFactor = Math.random() * 0.2 + 0.9; // ±10%
    const endPrice = startPrice * locationFactor;

    const profitPerUnit = endPrice - startPrice;
    const maxCargo = 500;

    return Math.max(0, profitPerUnit * maxCargo);
  }

  /**
   * Complete a trade route when arriving at destination
   */
  completeTradeRoute(playerId, routeId) {
    const route = this.tradeRoutes.get(routeId);
    if (!route || route.status === 'completed') return null;

    route.status = 'completed';

    const inventory = this.playerInventories.get(playerId);

    if (inventory && inventory.gold >= this.profitGoal) {
      return {
        success: true,
        routeCompleted: routeId,
        gold: inventory.gold,
        goalReached: true,
        message: 'Trading goal achieved!'
      };
    }

    return {
      success: true,
      routeCompleted: routeId,
      gold: inventory.gold,
      goalReached: false
    };
  }

  /**
   * Get market prices
   */
  getMarketPrices() {
    const prices = {};
    this.marketPrices.forEach((price, commodity) => {
      prices[commodity] = Math.round(price * 100) / 100;
    });
    return prices;
  }

  /**
   * Get player trading stats
   */
  getPlayerStats(playerId) {
    const inventory = this.playerInventories.get(playerId);
    if (!inventory) return null;

    return {
      playerId: playerId,
      gold: inventory.gold,
      cargo: inventory.cargo,
      cargoUsed: inventory.cargoUsed,
      cargoCapacity: inventory.cargoCapacity,
      cargoPercent: (inventory.cargoUsed / inventory.cargoCapacity) * 100
    };
  }

  /**
   * Start the trading session
   */
  startMatch() {
    this.matchState = 'active';
    this.startTime = Date.now();

    return {
      state: 'active',
      ports: Array.from(this.ports.entries()).map(([id, port]) => ({
        id,
        name: port.name,
        x: port.x,
        y: port.y,
        type: port.type
      }))
    };
  }

  /**
   * End the trading session
   */
  endMatch(winningPlayerId = null) {
    this.matchState = 'ended';

    const standings = Array.from(this.playerInventories.entries())
      .map(([playerId, inventory]) => ({
        playerId,
        gold: inventory.gold,
        rank: 0
      }))
      .sort((a, b) => b.gold - a.gold)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    return {
      state: 'ended',
      winner: standings[0],
      standings: standings,
      profitGoal: this.profitGoal
    };
  }

  /**
   * Get game overview
   */
  getGameOverview() {
    return {
      mode: 'trading',
      state: this.matchState,
      profitGoal: this.profitGoal,
      ports: Array.from(this.ports.entries()).map(([id, port]) => ({
        id,
        name: port.name,
        x: port.x,
        y: port.y,
        type: port.type,
        dockedPlayers: port.dockingPlayers.size
      })),
      marketPrices: this.getMarketPrices()
    };
  }

  /**
   * Export trading data
   */
  exportData() {
    return {
      matchId: this.matchId,
      matchState: this.matchState,
      playerInventories: Array.from(this.playerInventories.entries()).map(
        ([playerId, inventory]) => ({
          playerId,
          ...inventory
        })
      ),
      ports: Array.from(this.ports.entries()).map(([id, port]) => ({
        id,
        ...port,
        dockingPlayers: Array.from(port.dockingPlayers)
      }))
    };
  }

  /**
   * Clear mode data
   */
  clear() {
    this.isActive = false;
    this.ports.clear();
    this.tradeRoutes.clear();
    this.playerInventories.clear();
  }
}
