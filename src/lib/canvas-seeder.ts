import { canvasService } from "@/lib/canvas-service";
import { CanvasDocument } from "@/types";

export interface CanvasSeedData {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export class CanvasSeeder {
  /**
   * Seeds a canvas document if it doesn't exist
   * @param documentId - The document ID to check/create
   * @param seedData - The data to use for creating the canvas
   * @param createdBy - The user ID who is creating the canvas
   * @returns Promise<boolean> - true if canvas was created, false if it already existed
   */
  static async seedCanvas(
    documentId: string,
    seedData: CanvasSeedData,
    createdBy: string
  ): Promise<boolean> {
    try {
      // Check if canvas already exists
      const existingCanvas = await canvasService.loadCanvas(documentId);

      if (existingCanvas) {
        console.log(`Canvas ${documentId} already exists, skipping seed`);
        return false;
      }

      // Create the canvas document
      console.log(`Seeding canvas ${documentId} with data:`, seedData);

      await canvasService.createCanvas(
        seedData.name,
        seedData.description,
        createdBy,
        seedData.isPublic ?? true, // Default to public
        documentId
      );

      console.log(`Successfully seeded canvas ${documentId}`);
      return true;
    } catch (error) {
      console.error(`Error seeding canvas ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Seeds the main collaborative canvas with default data
   * @param createdBy - The user ID who is creating the canvas
   * @returns Promise<boolean> - true if canvas was created, false if it already existed
   */
  static async seedMainCanvas(createdBy: string): Promise<boolean> {
    const MAIN_CANVAS_ID = "main-collaborative-canvas";

    return this.seedCanvas(
      MAIN_CANVAS_ID,
      {
        name: "Main Collaborative Canvas",
        description: "A collaborative canvas for real-time editing",
        isPublic: true,
      },
      createdBy
    );
  }

  /**
   * Seeds a canvas with custom data
   * @param documentId - The document ID to create
   * @param seedData - The data to use for creating the canvas
   * @param createdBy - The user ID who is creating the canvas
   * @returns Promise<boolean> - true if canvas was created, false if it already existed
   */
  static async seedCustomCanvas(
    documentId: string,
    seedData: CanvasSeedData,
    createdBy: string
  ): Promise<boolean> {
    return this.seedCanvas(documentId, seedData, createdBy);
  }
}

// Export singleton instance for convenience
export const canvasSeeder = CanvasSeeder;
