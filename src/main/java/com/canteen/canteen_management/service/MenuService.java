package com.canteen.canteen_management.service;

import com.canteen.canteen_management.dto.MenuItemDto;
import com.canteen.canteen_management.entity.Category;
import com.canteen.canteen_management.entity.MenuItem;
import com.canteen.canteen_management.repository.CategoryRepository;
import com.canteen.canteen_management.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;

    public List<MenuItem> getAvailableItems() {
        return menuItemRepository.findByAvailableTrue();
    }

    public List<MenuItem> getAllItems() {
        return menuItemRepository.findAll();
    }

    public List<MenuItem> getItemsByCategory(Long categoryId) {
        return menuItemRepository.findByCategoryIdAndAvailableTrue(categoryId);
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc();
    }

    public MenuItem addItem(MenuItemDto dto) {
        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        MenuItem item = MenuItem.builder()
                .category(category)
                .name(dto.getName())
                .description(dto.getDescription())
                .price(dto.getPrice())
                .prepTimeMinutes(dto.getPrepTimeMinutes())
                .available(dto.getAvailable())
                .imageUrl(dto.getImageUrl())
                .build();

        return menuItemRepository.save(item);
    }

    public MenuItem updateItem(Long id, MenuItemDto dto) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        item.setCategory(category);
        item.setName(dto.getName());
        item.setDescription(dto.getDescription());
        item.setPrice(dto.getPrice());
        item.setPrepTimeMinutes(dto.getPrepTimeMinutes());
        item.setAvailable(dto.getAvailable());
        item.setImageUrl(dto.getImageUrl());

        return menuItemRepository.save(item);
    }

    public MenuItem toggleAvailability(Long id) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));
        item.setAvailable(!item.getAvailable());
        return menuItemRepository.save(item);
    }

    public void deleteItem(Long id) {
        menuItemRepository.deleteById(id);
    }
}