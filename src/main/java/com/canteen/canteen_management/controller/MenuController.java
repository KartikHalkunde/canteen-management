package com.canteen.canteen_management.controller;

import com.canteen.canteen_management.dto.MenuItemDto;
import com.canteen.canteen_management.entity.Category;
import com.canteen.canteen_management.entity.MenuItem;
import com.canteen.canteen_management.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    // ─── User endpoints ───────────────────────────────

    @GetMapping("/api/menu")
    public ResponseEntity<List<MenuItem>> getAvailableItems() {
        return ResponseEntity.ok(menuService.getAvailableItems());
    }

    @GetMapping("/api/menu/category/{categoryId}")
    public ResponseEntity<List<MenuItem>> getItemsByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(menuService.getItemsByCategory(categoryId));
    }

    @GetMapping("/api/menu/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(menuService.getAllCategories());
    }

    // ─── Admin endpoints ──────────────────────────────

    @GetMapping("/api/admin/menu")
    public ResponseEntity<List<MenuItem>> getAllItems() {
        return ResponseEntity.ok(menuService.getAllItems());
    }

    @PostMapping("/api/admin/menu")
    public ResponseEntity<MenuItem> addItem(@RequestBody MenuItemDto dto) {
        return ResponseEntity.ok(menuService.addItem(dto));
    }

    @PutMapping("/api/admin/menu/{id}")
    public ResponseEntity<MenuItem> updateItem(@PathVariable Long id,
                                               @RequestBody MenuItemDto dto) {
        return ResponseEntity.ok(menuService.updateItem(id, dto));
    }

    @PatchMapping("/api/admin/menu/{id}/toggle")
    public ResponseEntity<MenuItem> toggleAvailability(@PathVariable Long id) {
        return ResponseEntity.ok(menuService.toggleAvailability(id));
    }

    @DeleteMapping("/api/admin/menu/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        menuService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}